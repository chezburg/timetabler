import React from 'react';
import SectionChip from './SectionChip.jsx';

const COMPONENT_ORDER = ['LEC', 'LAB', 'TUT', 'SEM'];

function orderComponents(keys) {
  return [...keys].sort((a, b) => {
    const ia = COMPONENT_ORDER.indexOf(a);
    const ib = COMPONENT_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

export default function YourCourses({ courses, onRemoveCourse, onSelect, onDragStart, onDragEnd }) {
  if (!courses.length) {
    return (
      <section className="panel">
        <p className="panel-label">Your courses</p>
        <p className="muted empty-note">Add courses from the list above to start building your schedule.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <p className="panel-label">Your courses</p>
      <ul className="your-courses-list">
        {courses.map((course) => {
          const byComponent = new Map();
          for (const s of course.sections) {
            if (!byComponent.has(s.component)) byComponent.set(s.component, []);
            byComponent.get(s.component).push(s);
          }
          const components = orderComponents([...byComponent.keys()]);

          return (
            <li key={course.courseId} className="course-group" style={{ '--course-color': course.color }}>
              <div className="course-group-header">
                <span className="color-dot" aria-hidden="true" />
                <div className="course-group-heading">
                  <span className="course-code">{course.code}</span>
                  <span className="course-title">{course.title}</span>
                </div>
                <button
                  type="button"
                  className="btn-remove"
                  title={`Remove ${course.code} from this plan`}
                  onClick={() => onRemoveCourse(course.courseId)}
                >
                  &times;
                </button>
              </div>

              {components.map((component) => {
                const options = byComponent.get(component);
                const selectedId = course.selections[component];
                const locked = options.length === 1;
                return (
                  <div key={component} className="component-group">
                    <div className="component-label">
                      <span>{component}</span>
                      {locked ? (
                        <span className="badge badge-auto">auto</span>
                      ) : selectedId ? (
                        <span className="badge badge-ok">set</span>
                      ) : (
                        <span className="badge badge-todo">choose one</span>
                      )}
                    </div>
                    <div className="chip-list">
                      {options.map((section) => (
                        <SectionChip
                          key={section.id}
                          section={section}
                          selected={selectedId === section.id}
                          locked={locked}
                          courseColor={course.color}
                          onSelect={() => onSelect(course.courseId, component, section.id)}
                          onDragStart={() =>
                            onDragStart({
                              courseId: course.courseId,
                              component,
                              sectionId: section.id,
                              section,
                              courseColor: course.color,
                              courseCode: course.code,
                            })
                          }
                          onDragEnd={onDragEnd}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
