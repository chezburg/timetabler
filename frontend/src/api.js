const BASE = '/api';

async function handle(res) {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body.error) message = body.error;
    } catch {
      // response wasn't JSON; keep the generic message
    }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function uploadCatalog(file, label) {
  const form = new FormData();
  form.append('file', file);
  if (label) form.append('label', label);
  return fetch(`${BASE}/catalogs/upload`, { method: 'POST', body: form }).then(handle);
}

export function listCatalogs() {
  return fetch(`${BASE}/catalogs`).then(handle);
}

export function getCatalog(id) {
  return fetch(`${BASE}/catalogs/${id}`).then(handle);
}

export function deleteCatalog(id) {
  return fetch(`${BASE}/catalogs/${id}`, { method: 'DELETE' }).then(handle);
}

export function createSchedule(catalogId, name) {
  return fetch(`${BASE}/schedules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ catalogId, name }),
  }).then(handle);
}

export function listSchedules(catalogId) {
  const qs = catalogId ? `?catalogId=${encodeURIComponent(catalogId)}` : '';
  return fetch(`${BASE}/schedules${qs}`).then(handle);
}

export function getSchedule(id) {
  return fetch(`${BASE}/schedules/${id}`).then(handle);
}

export function renameSchedule(id, name) {
  return fetch(`${BASE}/schedules/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  }).then(handle);
}

export function deleteSchedule(id) {
  return fetch(`${BASE}/schedules/${id}`, { method: 'DELETE' }).then(handle);
}

export function addCourseToSchedule(scheduleId, courseId) {
  return fetch(`${BASE}/schedules/${scheduleId}/courses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courseId }),
  }).then(handle);
}

export function removeCourseFromSchedule(scheduleId, courseId) {
  return fetch(`${BASE}/schedules/${scheduleId}/courses/${courseId}`, { method: 'DELETE' }).then(handle);
}

export function setSelection(scheduleId, courseId, component, sectionId) {
  return fetch(`${BASE}/schedules/${scheduleId}/selection`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courseId, component, sectionId }),
  }).then(handle);
}
