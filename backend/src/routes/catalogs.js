import { Router } from 'express';
import multer from 'multer';
import { nanoid } from 'nanoid';
import { db } from '../db.js';
import { parseWorkbook } from '../parser.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB is generous for a course catalog xlsx
  fileFilter: (req, file, cb) => {
    const okExt = /\.(xlsx|xls|xlsm|csv)$/i.test(file.originalname);
    if (!okExt) return cb(new Error('Please upload an .xlsx, .xls, or .csv file'));
    cb(null, true);
  },
});

const router = Router();

function loadCatalogTree(catalogId) {
  const catalog = db.prepare('SELECT * FROM catalogs WHERE id = ?').get(catalogId);
  if (!catalog) return null;

  const courses = db
    .prepare('SELECT * FROM courses WHERE catalog_id = ? ORDER BY code, title')
    .all(catalogId);

  const sectionStmt = db.prepare('SELECT * FROM sections WHERE course_id = ? ORDER BY component, section_number');
  const meetingStmt = db.prepare('SELECT * FROM meetings WHERE section_id = ? ORDER BY day, start_minutes');

  const courseList = courses.map((course) => {
    const sections = sectionStmt.all(course.id).map((section) => ({
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
    return {
      id: course.id,
      code: course.code,
      title: course.title,
      fullName: course.full_name,
      sections,
    };
  });

  return {
    id: catalog.id,
    filename: catalog.filename,
    label: catalog.label,
    uploadedAt: catalog.uploaded_at,
    rowCount: catalog.row_count,
    courses: courseList,
  };
}

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded (expected field "file")' });

  let parsed;
  try {
    parsed = parseWorkbook(req.file.buffer);
  } catch (err) {
    return res.status(422).json({ error: err.message });
  }

  if (!parsed.length) {
    return res.status(422).json({ error: 'No course rows found in that file.' });
  }

  const catalogId = nanoid();
  const now = new Date().toISOString();
  const label = req.body.label?.trim() || req.file.originalname.replace(/\.[^.]+$/, '');
  const totalRows = parsed.reduce((sum, c) => sum + c.sections.length, 0);

  const insertCatalog = db.prepare(
    'INSERT INTO catalogs (id, filename, label, uploaded_at, row_count) VALUES (?, ?, ?, ?, ?)'
  );
  const insertCourse = db.prepare(
    'INSERT INTO courses (id, catalog_id, code, title, full_name) VALUES (?, ?, ?, ?, ?)'
  );
  const insertSection = db.prepare(
    `INSERT INTO sections (id, course_id, component, section_number, class_nbr, instructor, requisites, credit_units, status, waitlist, campus, delivery_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertMeeting = db.prepare(
    `INSERT INTO meetings (id, section_id, day, start_minutes, end_minutes, start_label, end_label, location, is_tba)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  db.exec('BEGIN');
  try {
    insertCatalog.run(catalogId, req.file.originalname, label, now, totalRows);

    for (const course of parsed) {
      const courseId = nanoid();
      insertCourse.run(courseId, catalogId, course.code, course.title, course.fullName);

      for (const section of course.sections) {
        const sectionId = nanoid();
        insertSection.run(
          sectionId,
          courseId,
          section.component,
          section.sectionNumber,
          section.classNbr,
          section.instructor,
          section.requisites,
          section.creditUnits,
          section.status,
          section.waitlist,
          section.campus,
          section.deliveryType
        );

        for (const m of section.meetings) {
          insertMeeting.run(
            nanoid(),
            sectionId,
            m.day,
            m.startMinutes,
            m.endMinutes,
            m.startLabel,
            m.endLabel,
            m.location,
            m.isTba ? 1 : 0
          );
        }
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    return res.status(500).json({ error: `Failed to store parsed catalog: ${err.message}` });
  }

  res.status(201).json(loadCatalogTree(catalogId));
});

router.get('/', (req, res) => {
  const rows = db
    .prepare('SELECT id, filename, label, uploaded_at, row_count FROM catalogs ORDER BY uploaded_at DESC')
    .all();
  res.json(
    rows.map((r) => ({
      id: r.id,
      filename: r.filename,
      label: r.label,
      uploadedAt: r.uploaded_at,
      rowCount: r.row_count,
    }))
  );
});

router.get('/:id', (req, res) => {
  const tree = loadCatalogTree(req.params.id);
  if (!tree) return res.status(404).json({ error: 'Catalog not found' });
  res.json(tree);
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM catalogs WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Catalog not found' });
  res.status(204).end();
});

export default router;
