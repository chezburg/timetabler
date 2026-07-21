import React from 'react';

export default function CoursePool({ courses, search, onSearch, onAdd }) {
  return (
    <section className="panel">
      <p className="panel-label">Add courses</p>
      <input
        className="search-input"
        type="search"
        placeholder="Search by code or title…"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />
      <ul className="course-pool-list">
        {courses.length === 0 && <li className="muted empty-note">No matching courses.</li>}
        {courses.map((course) => (
          <li key={course.id} className="course-pool-row">
            <div>
              <span className="course-code">{course.code}</span>
              <span className="course-title">{course.title}</span>
            </div>
            <button type="button" className="btn-add" onClick={() => onAdd(course.id)}>
              Add
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
