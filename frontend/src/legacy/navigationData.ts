// Bottom navigation is data-driven so labels and indexes match web/app.js.
export const studentNavItems = [
  { view: "practice", label: "Practice", index: "01" },
  { view: "tasks", label: "Tasks", index: "02" },
  { view: "progress", label: "Progress", index: "03" },
  { view: "chat", label: "Chat", index: "04" },
  { view: "account", label: "Me", index: "05" },
] as const;

// Teacher nav mirrors the legacy teacher dashboard tabs.
export const teacherNavItems = [
  { view: "home", label: "Home", index: "01" },
  { view: "students", label: "Learners", index: "02" },
  { view: "tasks", label: "Tasks", index: "03" },
  { view: "reviews", label: "Reviews", index: "04" },
  { view: "chat", label: "Chat", index: "05" },
  { view: "account", label: "Account", index: "06" },
] as const;
