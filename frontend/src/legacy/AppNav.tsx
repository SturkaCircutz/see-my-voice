import {
  studentNavItems,
  teacherNavItems,
  type Role,
  type StudentView,
  type TeacherView,
} from "./data";

export function AppNav({
  role,
  studentView,
  teacherView,
  onStudentView,
  onTeacherView,
}: {
  role: Role;
  studentView: StudentView;
  teacherView: TeacherView;
  onStudentView: (view: StudentView) => void;
  onTeacherView: (view: TeacherView) => void;
}) {
  // Guests stay on the role picker and do not need tab navigation.
  if (role === "guest") return <nav className="hidden" aria-label="Main pages" hidden />;

  const navClass =
    "absolute inset-x-0 bottom-0 z-[5] grid border-t border-[rgba(207,200,189,0.92)] bg-[rgba(255,254,250,0.94)] px-2.5 pt-[7px] pb-[calc(7px+env(safe-area-inset-bottom))] backdrop-blur-[16px] lg:inset-y-0 lg:inset-x-auto lg:left-0 lg:w-[176px] lg:auto-rows-min lg:grid-cols-1 lg:gap-2 lg:border-t-0 lg:border-r lg:bg-[rgba(255,254,250,0.98)] lg:px-4 lg:py-5";
  const navButtonClass = (active: boolean) =>
    `grid min-h-[51px] place-items-center content-center gap-px rounded-xl text-[11px] lg:min-h-[54px] lg:grid-cols-[28px_1fr] lg:justify-items-start lg:gap-2.5 lg:px-3 lg:text-left lg:text-[13px] ${
      active ? "bg-[var(--red-soft)] font-extrabold text-[var(--red)]" : "text-[var(--muted)]"
    }`;

  const activeTeacherView =
    // Editor sub-pages should keep their parent nav tab active.
    teacherView === "assessmentEditor" || teacherView === "taskPackageEditor"
      ? "tasks"
      : teacherView === "reviewEditor"
        ? "reviews"
        : teacherView;

  if (role === "teacher") {
    return (
      <nav
        className={`${navClass} grid-cols-6`}
        aria-label="Main pages"
      >
        {teacherNavItems.map((item) => (
          <button
            className={navButtonClass(item.view === activeTeacherView)}
            type="button"
            key={item.view}
            data-teacher-view={item.view}
            aria-current={item.view === activeTeacherView ? "page" : "false"}
            onClick={() => onTeacherView(item.view)}
          >
            <span className="text-[9px] tracking-[0.12em]">{item.index}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    );
  }

  const activeStudentView = ["detail", "entryAssessment", "toneDrill", "teachingClip"].includes(studentView)
    // Detail and drill screens are part of the learner practice area.
    ? "practice"
    : studentView === "taskDetail"
      ? "tasks"
    : studentView;
  return (
    <nav
      className={`${navClass} grid-cols-5`}
      aria-label="Main pages"
    >
      {studentNavItems.map((item) => (
        <button
          className={navButtonClass(item.view === activeStudentView)}
          type="button"
          key={item.view}
          data-view={item.view}
          aria-current={item.view === activeStudentView ? "page" : "false"}
          onClick={() => onStudentView(item.view)}
        >
          <span className="text-[9px] tracking-[0.12em]">{item.index}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
