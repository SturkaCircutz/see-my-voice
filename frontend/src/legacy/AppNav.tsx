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

  const activeTeacherView =
    teacherView === "assessmentEditor" || teacherView === "taskPackageEditor"
      ? "tasks"
      : teacherView === "reviewEditor"
        ? "reviews"
        : teacherView;

  if (role === "teacher") {
    return (
      <nav
        className="absolute inset-x-0 bottom-0 z-[5] grid grid-cols-6 border-t border-[rgba(207,200,189,0.92)] bg-[rgba(255,254,250,0.94)] px-2.5 pt-[7px] pb-[calc(7px+env(safe-area-inset-bottom))] backdrop-blur-[16px]"
        aria-label="Main pages"
      >
        {teacherNavItems.map((item) => (
          <button
            className={`grid min-h-[51px] place-items-center content-center gap-px rounded-xl text-[11px] ${
              item.view === activeTeacherView
                ? "bg-[var(--red-soft)] font-extrabold text-[var(--red)]"
                : "text-[var(--muted)]"
            }`}
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
    ? "practice"
    : studentView === "taskDetail"
      ? "tasks"
    : studentView;
  return (
    <nav
      className="absolute inset-x-0 bottom-0 z-[5] grid grid-cols-5 border-t border-[rgba(207,200,189,0.92)] bg-[rgba(255,254,250,0.94)] px-2.5 pt-[7px] pb-[calc(7px+env(safe-area-inset-bottom))] backdrop-blur-[16px]"
      aria-label="Main pages"
    >
      {studentNavItems.map((item) => (
        <button
          className={`grid min-h-[51px] place-items-center content-center gap-px rounded-xl text-[11px] ${
            item.view === activeStudentView
              ? "bg-[var(--red-soft)] font-extrabold text-[var(--red)]"
              : "text-[var(--muted)]"
          }`}
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
