export const STATUSES = ["not_started", "in_progress", "completed"] as const;

export type CardStatus = (typeof STATUSES)[number];

export const getStatusLabel = (status: CardStatus) => {
  switch (status) {
    case "not_started":
      return "Not started";
    case "in_progress":
      return "In progress";
    case "completed":
      return "Completed";
    default:
      return status;
  }
};

export const getStatusColor = (status: CardStatus) => {
  switch (status) {
    case "not_started":
      return "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
    case "in_progress":
      return "bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-100";
    case "completed":
      return "bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export const getNextStatus = (status: CardStatus): CardStatus => {
  const currentIndex = STATUSES.indexOf(status);
  const nextIndex = (currentIndex + 1) % STATUSES.length;
  return STATUSES[nextIndex];
};
