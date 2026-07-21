import React, { useEffect, useState, useCallback, useMemo } from 'react';
import * as api from './api.js';
import { flattenSelectedMeetings, findConflicts } from './utils/conflicts.js';
import { buildRequirements } from './utils/term.js';
import TopBar from './components/TopBar.jsx';
import UploadPanel from './components/UploadPanel.jsx';
import CoursePool from './components/CoursePool.jsx';
import YourCourses from './components/YourCourses.jsx';
import CalendarGrid from './components/CalendarGrid.jsx';
import ConflictBanner from './components/ConflictBanner.jsx';
import Toast from './components/Toast.jsx';

export default function App() {
  const [catalogs, setCatalogs] = useState([]);
  const [catalogId, setCatalogId] = useState(null);
  const [catalog, setCatalog] = useState(null);

  const [schedules, setSchedules] = useState([]);
  const [scheduleId, setScheduleId] = useState(null);
  const [schedule, setSchedule] = useState(null);

  const [poolSearch, setPoolSearch] = useState('');
  const [draggingChip, setDraggingChip] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Frontend-only preferences (reset on reload): manual Fall/Winter corrections
  // for courses whose term the alphabetical-suffix heuristic guesses wrong, and
  // an optional self-reported stream/program used for the lightweight
  // restriction-matching hint on section chips.
  const [termOverrides, setTermOverrides] = useState({});
  const [streamText, setStreamText] = useState('');

  const flashError = useCallback((err) => {
    setError(typeof err === 'string' ? err : err?.message || 'Something went wrong');
  }, []);

  useEffect(() => {
    api
      .listCatalogs()
      .then((list) => {
        setCatalogs(list);
        if (list.length) setCatalogId(list[0].id);
      })
      .catch(flashError);
  }, [flashError]);

  useEffect(() => {
    if (!catalogId) {
      setCatalog(null);
      setSchedules([]);
      setScheduleId(null);
      setSchedule(null);
      return;
    }
    api.getCatalog(catalogId).then(setCatalog).catch(flashError);
    api
      .listSchedules(catalogId)
      .then(async (list) => {
        setSchedules(list);
        if (list.length) {
          setScheduleId(list[0].id);
        } else {
          const created = await api.createSchedule(catalogId, 'My Schedule');
          setSchedules([{ id: created.id, catalogId, name: created.name, createdAt: created.createdAt, updatedAt: created.updatedAt }]);
          setScheduleId(created.id);
        }
      })
      .catch(flashError);
  }, [catalogId, flashError]);

  useEffect(() => {
    if (!scheduleId) {
      setSchedule(null);
      return;
    }
    api.getSchedule(scheduleId).then(setSchedule).catch(flashError);
  }, [scheduleId, flashError]);

  const refreshSchedulesList = useCallback((updated) => {
    setSchedules((prev) => {
      const exists = prev.some((s) => s.id === updated.id);
      const entry = { id: updated.id, catalogId: updated.catalogId, name: updated.name, createdAt: updated.createdAt, updatedAt: updated.updatedAt };
      return exists ? prev.map((s) => (s.id === updated.id ? entry : s)) : [entry, ...prev];
    });
  }, []);

  const handleUpload = useCallback(
    async (file) => {
      setBusy(true);
      try {
        const newCatalog = await api.uploadCatalog(file);
        setCatalogs((prev) => [{ id: newCatalog.id, filename: newCatalog.filename, label: newCatalog.label, uploadedAt: newCatalog.uploadedAt, rowCount: newCatalog.rowCount }, ...prev]);
        setCatalog(newCatalog);
        setCatalogId(newCatalog.id);
        const created = await api.createSchedule(newCatalog.id, 'My Schedule');
        setSchedules([{ id: created.id, catalogId: newCatalog.id, name: created.name, createdAt: created.createdAt, updatedAt: created.updatedAt }]);
        setScheduleId(created.id);
        setSchedule(created);
      } catch (err) {
        flashError(err);
      } finally {
        setBusy(false);
      }
    },
    [flashError]
  );

  const handleAddCourse = useCallback(
    async (courseId) => {
      try {
        const updated = await api.addCourseToSchedule(scheduleId, courseId);
        setSchedule(updated);
      } catch (err) {
        flashError(err);
      }
    },
    [scheduleId, flashError]
  );

  const handleRemoveCourse = useCallback(
    async (courseId) => {
      try {
        const updated = await api.removeCourseFromSchedule(scheduleId, courseId);
        setSchedule(updated);
      } catch (err) {
        flashError(err);
      }
    },
    [scheduleId, flashError]
  );

  const handleSetSelection = useCallback(
    async (courseId, component, sectionId) => {
      try {
        const updated = await api.setSelection(scheduleId, courseId, component, sectionId);
        setSchedule(updated);
      } catch (err) {
        flashError(err);
      }
    },
    [scheduleId, flashError]
  );

  const handleSwapTerm = useCallback(
    async (currentCourseId, siblingCourseId) => {
      try {
        await api.removeCourseFromSchedule(scheduleId, currentCourseId);
        const updated = await api.addCourseToSchedule(scheduleId, siblingCourseId);
        setSchedule(updated);
      } catch (err) {
        flashError(err);
      }
    },
    [scheduleId, flashError]
  );

  const handleNewSchedule = useCallback(
    async (name) => {
      try {
        const created = await api.createSchedule(catalogId, name);
        refreshSchedulesList(created);
        setScheduleId(created.id);
        setSchedule(created);
      } catch (err) {
        flashError(err);
      }
    },
    [catalogId, flashError, refreshSchedulesList]
  );

  const handleRenameSchedule = useCallback(
    async (name) => {
      try {
        const updated = await api.renameSchedule(scheduleId, name);
        setSchedule(updated);
        refreshSchedulesList(updated);
      } catch (err) {
        flashError(err);
      }
    },
    [scheduleId, flashError, refreshSchedulesList]
  );

  const handleDeleteSchedule = useCallback(async () => {
    try {
      await api.deleteSchedule(scheduleId);
      const remaining = schedules.filter((s) => s.id !== scheduleId);
      if (remaining.length) {
        setSchedules(remaining);
        setScheduleId(remaining[0].id);
      } else {
        const created = await api.createSchedule(catalogId, 'My Schedule');
        setSchedules([{ id: created.id, catalogId, name: created.name, createdAt: created.createdAt, updatedAt: created.updatedAt }]);
        setScheduleId(created.id);
      }
    } catch (err) {
      flashError(err);
    }
  }, [scheduleId, schedules, catalogId, flashError]);

  // --- Requirement grouping (course-code family -> Fall/Winter/Full-year variants) ---
  const requirements = useMemo(() => (catalog ? buildRequirements(catalog.courses, termOverrides) : []), [catalog, termOverrides]);

  const courseTermInfo = useMemo(() => {
    const map = {};
    for (const req of requirements) {
      for (const variant of req.variants) {
        const sibling = req.variants.find((v) => v.id !== variant.id);
        map[variant.id] = {
          term: variant.term,
          siblingCourseId: sibling ? sibling.id : null,
          siblingLabel: sibling ? sibling.term : null,
        };
      }
    }
    return map;
  }, [requirements]);

  const addedCourseIds = useMemo(() => new Set(schedule ? schedule.courses.map((c) => c.courseId) : []), [schedule]);

  // A requirement disappears from the pool once any one of its term variants has
  // been added — picking Fall or Winter satisfies the whole requirement, so the
  // other becomes unavailable until you remove/swap it (point 8).
  const poolRequirements = useMemo(
    () => requirements.filter((req) => !req.variants.some((v) => addedCourseIds.has(v.id))),
    [requirements, addedCourseIds]
  );

  const flatMeetings = useMemo(() => (schedule ? flattenSelectedMeetings(schedule.courses) : []), [schedule]);

  const fallMeetings = useMemo(
    () => flatMeetings.filter((fm) => ['Fall', 'FullYear'].includes(courseTermInfo[fm.courseId]?.term)),
    [flatMeetings, courseTermInfo]
  );
  const winterMeetings = useMemo(
    () => flatMeetings.filter((fm) => ['Winter', 'FullYear'].includes(courseTermInfo[fm.courseId]?.term)),
    [flatMeetings, courseTermInfo]
  );

  const fallConflicts = useMemo(() => findConflicts(fallMeetings), [fallMeetings]);
  const winterConflicts = useMemo(() => findConflicts(winterMeetings), [winterMeetings]);

  const estimatedUnits = useMemo(() => {
    if (!schedule) return 0;
    let total = 0;
    for (const course of schedule.courses) {
      let best = 0;
      for (const s of course.sections) {
        const v = parseFloat(s.creditUnits);
        if (!Number.isNaN(v)) best = Math.max(best, v);
      }
      total += best;
    }
    return total;
  }, [schedule]);

  const handleDropChip = useCallback(
    (chip) => {
      handleSetSelection(chip.courseId, chip.component, chip.sectionId);
      setDraggingChip(null);
    },
    [handleSetSelection]
  );

  const handleClearSlot = useCallback(
    (courseId, component) => handleSetSelection(courseId, component, null),
    [handleSetSelection]
  );

  return (
    <div className="app-shell">
      <TopBar
        catalogs={catalogs}
        catalogId={catalogId}
        onSwitchCatalog={setCatalogId}
        schedules={schedules}
        scheduleId={scheduleId}
        scheduleName={schedule?.name}
        onSwitchSchedule={setScheduleId}
        onNewSchedule={handleNewSchedule}
        onRenameSchedule={handleRenameSchedule}
        onDeleteSchedule={handleDeleteSchedule}
        hasCatalog={!!catalog}
      />

      {error && <Toast message={error} onDismiss={() => setError(null)} />}

      <div className="workspace">
        <aside className="sidebar">
          <UploadPanel compact={!!catalog} onUpload={handleUpload} busy={busy} catalogs={catalogs} onPickExisting={setCatalogId} />

          {catalog && (
            <>
              <section className="panel stream-panel">
                <p className="panel-label">My stream / program (optional)</p>
                <input
                  className="search-input"
                  type="text"
                  placeholder="e.g. Electrical, Mechanical, Software…"
                  value={streamText}
                  onChange={(e) => setStreamText(e.target.value)}
                />
                <p className="muted stream-hint-note">
                  Used only for a rough restriction hint on section chips — always double-check the exact restriction text.
                </p>
              </section>

              <CoursePool requirements={poolRequirements} search={poolSearch} onSearch={setPoolSearch} onAdd={handleAddCourse} />
              <YourCourses
                courses={schedule ? schedule.courses : []}
                courseTermInfo={courseTermInfo}
                streamText={streamText}
                onRemoveCourse={handleRemoveCourse}
                onSelect={handleSetSelection}
                onDragStart={setDraggingChip}
                onDragEnd={() => setDraggingChip(null)}
                onSwapTerm={handleSwapTerm}
                onOverrideTerm={(courseId, term) => setTermOverrides((prev) => ({ ...prev, [courseId]: term }))}
              />
              <div className="sidebar-footer">
                <span>Estimated credit units</span>
                <strong>{estimatedUnits.toFixed(2)}</strong>
              </div>
            </>
          )}
        </aside>

        <main className="main-stage">
          <div className="dual-calendar-row">
            <div className="calendar-column">
              <ConflictBanner pairs={fallConflicts.pairs} />
              <CalendarGrid
                term="Fall"
                title="Fall Term"
                flatMeetings={fallMeetings}
                conflictKeys={fallConflicts.conflictKeys}
                draggingChip={draggingChip}
                onDropChip={handleDropChip}
                onClearSlot={handleClearSlot}
              />
            </div>
            <div className="calendar-column">
              <ConflictBanner pairs={winterConflicts.pairs} />
              <CalendarGrid
                term="Winter"
                title="Winter Term"
                flatMeetings={winterMeetings}
                conflictKeys={winterConflicts.conflictKeys}
                draggingChip={draggingChip}
                onDropChip={handleDropChip}
                onClearSlot={handleClearSlot}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
