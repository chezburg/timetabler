import React, { useEffect, useState, useCallback, useMemo } from 'react';
import * as api from './api.js';
import { flattenSelectedMeetings, findConflicts } from './utils/conflicts.js';
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

  const flashError = useCallback((err) => {
    setError(typeof err === 'string' ? err : err?.message || 'Something went wrong');
  }, []);

  // Initial load: fetch catalog list, select the most recent one if any.
  useEffect(() => {
    api
      .listCatalogs()
      .then((list) => {
        setCatalogs(list);
        if (list.length) setCatalogId(list[0].id);
      })
      .catch(flashError);
  }, [flashError]);

  // When the active catalog changes, load its full course tree and its saved schedules.
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

  // When the active schedule changes, load its full detail (courses/sections/selections).
  useEffect(() => {
    if (!scheduleId) {
      setSchedule(null);
      return;
    }
    api.getSchedule(scheduleId).then(setSchedule).catch(flashError);
  }, [scheduleId, flashError]);

  const refreshSchedulesList = useCallback(
    (updated) => {
      setSchedules((prev) => {
        const exists = prev.some((s) => s.id === updated.id);
        const entry = { id: updated.id, catalogId: updated.catalogId, name: updated.name, createdAt: updated.createdAt, updatedAt: updated.updatedAt };
        return exists ? prev.map((s) => (s.id === updated.id ? entry : s)) : [entry, ...prev];
      });
    },
    []
  );

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

  const flatMeetings = useMemo(() => (schedule ? flattenSelectedMeetings(schedule.courses) : []), [schedule]);
  const { conflictKeys, pairs: conflictPairs } = useMemo(() => findConflicts(flatMeetings), [flatMeetings]);

  const addedCourseIds = useMemo(() => new Set(schedule ? schedule.courses.map((c) => c.courseId) : []), [schedule]);
  const poolCourses = useMemo(() => {
    if (!catalog) return [];
    const q = poolSearch.trim().toLowerCase();
    return catalog.courses.filter((c) => {
      if (addedCourseIds.has(c.id)) return false;
      if (!q) return true;
      return c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q);
    });
  }, [catalog, addedCourseIds, poolSearch]);

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

      {!catalog ? (
        <div className="empty-stage">
          <UploadPanel onUpload={handleUpload} busy={busy} catalogs={catalogs} onPickExisting={setCatalogId} />
        </div>
      ) : (
        <div className="workspace">
          <aside className="sidebar">
            <UploadPanel compact onUpload={handleUpload} busy={busy} catalogs={catalogs} onPickExisting={setCatalogId} />
            <CoursePool courses={poolCourses} search={poolSearch} onSearch={setPoolSearch} onAdd={handleAddCourse} />
            <YourCourses
              courses={schedule ? schedule.courses : []}
              onRemoveCourse={handleRemoveCourse}
              onSelect={handleSetSelection}
              onDragStart={setDraggingChip}
              onDragEnd={() => setDraggingChip(null)}
            />
            <div className="sidebar-footer">
              <span>Estimated credit units</span>
              <strong>{estimatedUnits.toFixed(2)}</strong>
            </div>
          </aside>

          <main className="main-stage">
            <ConflictBanner pairs={conflictPairs} />
            <CalendarGrid
              flatMeetings={flatMeetings}
              conflictKeys={conflictKeys}
              draggingChip={draggingChip}
              onDropChip={(chip) => {
                handleSetSelection(chip.courseId, chip.component, chip.sectionId);
                setDraggingChip(null);
              }}
              onClearSlot={(courseId, component) => handleSetSelection(courseId, component, null)}
            />
          </main>
        </div>
      )}
    </div>
  );
}
