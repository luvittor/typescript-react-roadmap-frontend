export type MonthKey = {
  year: number;
  month: number; // 1-12
};

export const getConsecutiveMonths = (start: Date, count: number): MonthKey[] => {
  const months: MonthKey[] = [];
  for (let i = 0; i < count; i += 1) {
    const date = new Date(start);
    date.setMonth(start.getMonth() + i);
    months.push({ year: date.getFullYear(), month: date.getMonth() + 1 });
  }
  return months;
};

export const formatMonthLabel = ({ year, month }: MonthKey) => {
  const date = new Date(year, month - 1);
  return date.toLocaleDateString(undefined, {
    month: "short",
    year: "2-digit",
  });
};

export const isSameMonthKey = (a: MonthKey, b: MonthKey) => a.year === b.year && a.month === b.month;
