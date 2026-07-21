import { Router } from 'express';
import { nanoid } from 'nanoid';
import { db } from '../db.js';
import { colorForIndex } from '../colors.js';

const router = Router();

function loadSchedule(scheduleId) {
  const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(scheduleId);
  if (!schedule) return null;

  const scheduleCourses = db
    .prepare(
      `SELECT sc.course_id, sc.color, c.code, c.title, c.full_name
       FROM schedule_courses sc JOIN courses c ON c.id = sc.course_id
       WHERE sc.schedule_id = ? ORDER BY c.code`
    )
    .all(scheduleId);

  const sectionStmt = db.prepare('SELECT * FROM sections WHERE course_id = ? ORDER BY component, section_number');
  const meetingStmt = db.prepare('SELECT * FROM meetings WHERE section_id = ? ORDER BY day, start_minutes');
  const selectionStmt = db.prepare(
    'SELECT component, section_id FROM schedule_selections WHERE schedule_id = ? AND course_id = ?'
  );

  const courses = scheduleCourses.map((sc) => {
    const sections = sectionStmt.all(sc.course_id).map((section) => ({
      id: section.id,
      component: section.component,
      sectionNumber: section.section_number,
      classNbr: section.class_nbr,
      instructor: section.instructor,
      requisites: section.requisites,
      creditUnits: section.credit_units,
      status: section.status,
      waitlist: section.waitlist,
      campus: section.campus,
      deliveryType: section.delivery_type,
      meetings: meetingStmt.all(section.id).map((m) => ({
        id: m.id,
        day: m.day,
        startMinutes: m.start_minutes,
        endMinutes: m.end_minutes,
        startLabel: m.start_label,
        endLabel: m.end_label,
        location: m.location,
        isTba: !!m.is_tba,
      })),
    }));

    const selections = {};
    for (const row of selectionStmt.all(scheduleId, sc.course_id)) {
      selections[row.component] = row.section_id;
    }

    return {
      courseId: sc.course_id,
      code: sc.code,
      title: sc.title,
      fullName: sc.full_name,
      color: sc.color,
      sections,
      selections,
    };
  });

  return {
    id: schedule.id,
    catalogId: schedule.catalog_id,
    name: schedule.name,
    createdAt: schedule.created_at,
    updatedAt: schedule.updated_at,
    courses,
  };
}

function touch(scheduleId) {
  db.prepare('UPDATE schedules SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), scheduleId);
}

/** Auto-selects the section for any component group that has exactly one option. */
function autoPopulateSingles(scheduleId, courseId) {
  const sections = db.prepare('SELECT * FROM sections WHERE course_id = ?').all(courseId);
  const byComponent = new Map();
  for (const s of sections) {
    if (!byComponent.has(s.component)) byComponent.set(s.component, []);
    byComponent.get(s.component).push(s);
  }

  const upsert = db.prepare(
    `INSERT INTO schedule_selections (schedule_id, course_id, component, section_id)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(schedule_id, course_id, component) DO UPDATE SET section_id = excluded.section_id`
  );

  for (const [component, options] of byComponent.entries()) {
    if (options.length === 1) {
      upsert.run(scheduleId, courseId, component, options[0].id);
    } else {
      // Ensure a row exists (as "unresolved") so the frontend knows this component needs a choice.
      const existing = db
        .prepare('SELECT 1 FROM schedule_selections WHERE schedule_id = ? AND course_id = ? AND component = ?')
        .get(scheduleId, courseId, component);
      if (!existing) {
        db.prepare(
          'INSERT INTO schedule_selections (schedule_id, course_id, component, section_id) VALUES (?, ?, ?, NULL)'
        ).run(scheduleId, courseId, component);
      }
    }
  }
}

router.post('/', (req, res) => {
  const { catalogId, name } = req.body;
  if (!catalogId) return res.status(400).json({ error: 'catalogId is required' });
  const catalog = db.prepare('SELECT id FROM catalogs WHERE id = ?').get(catalogId);
  if (!catalog) return res.status(404).json({ error: 'Catalog not found' });

  const id = nanoid();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO schedules (id, catalog_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
    id,
    catalogId,
    name?.trim() || 'Untitled schedule',
    now,
    now
  );
  res.status(201).json(loadSchedule(id));
});

router.get('/', (req, res) => {
  const { catalogId } = req.query;
  const rows = catalogId
    ? db.prepare('SELECT * FROM schedules WHERE catalog_id = ? ORDER BY updated_at DESC').all(catalogId)
    : db.prepare('SELECT * FROM schedules ORDER BY updated_at DESC').all();

  res.json(
    rows.map((r) => ({
      id: r.id,
      catalogId: r.catalog_id,
      name: r.name,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }))
  );
});

router.get('/:id', (req, res) => {
  const schedule = loadSchedule(req.params.id);
  if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
  res.json(schedule);
});

router.put('/:id', (req, res) => {
  const { name } = req.body;
  const info = db.prepare('UPDATE schedules SET name = ?, updated_at = ? WHERE id = ?').run(
    name?.trim() || 'Untitled schedule',
    new Date().toISOString(),
    req.params.id
  );
  if (info.changes === 0) return res.status(404).json({ error: 'Schedule not found' });
  res.json(loadSchedule(req.params.id));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM schedules WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Schedule not found' });
  res.status(204).end();
});

router.post('/:id/courses', (req, res) => {
  const scheduleId = req.params.id;
  const { courseId } = req.body;
  const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(scheduleId);
  if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const already = db
    .prepare('SELECT 1 FROM schedule_courses WHERE schedule_id = ? AND course_id = ?')
    .get(scheduleId, courseId);

  if (!already) {
    const count = db
      .prepare('SELECT COUNT(*) as n FROM schedule_courses WHERE schedule_id = ?')
      .get(scheduleId).n;
    db.prepare('INSERT INTO schedule_courses (schedule_id, course_id, color) VALUES (?, ?, ?)').run(
      scheduleId,
      courseId,
      colorForIndex(count)
    );
    autoPopulateSingles(scheduleId, courseId);
    touch(scheduleId);
  }

  res.status(201).json(loadSchedule(scheduleId));
});

router.delete('/:id/courses/:courseId', (req, res) => {
  const { id: scheduleId, courseId } = req.params;
  db.prepare('DELETE FROM schedule_selections WHERE schedule_id = ? AND course_id = ?').run(scheduleId, courseId);
  const info = db
    .prepare('DELETE FROM schedule_courses WHERE schedule_id = ? AND course_id = ?')
    .run(scheduleId, courseId);
  if (info.changes === 0) return res.status(404).json({ error: 'Course was not in this schedule' });
  touch(scheduleId);
  res.json(loadSchedule(scheduleId));
});

router.put('/:id/selection', (req, res) => {
  const scheduleId = req.params.id;
  const { courseId, component, sectionId } = req.body;
  if (!courseId || !component) return res.status(400).json({ error: 'courseId and component are required' });

  const inSchedule = db
    .prepare('SELECT 1 FROM schedule_courses WHERE schedule_id = ? AND course_id = ?')
    .get(scheduleId, courseId);
  if (!inSchedule) return res.status(404).json({ error: 'Course is not part of this schedule' });

  db.prepare(
    `INSERT INTO schedule_selections (schedule_id, course_id, component, section_id)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(schedule_id, course_id, component) DO UPDATE SET section_id = excluded.section_id`
  ).run(scheduleId, courseId, component, sectionId || null);

  touch(scheduleId);
  res.json(loadSchedule(scheduleId));
});

export default router;
