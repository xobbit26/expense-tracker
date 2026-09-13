export interface DateRange {
  gte: Date;
  lt: Date;
}

export function toDateRange(year?: number, month?: number): DateRange | undefined {
  if (year === undefined) {
    return undefined;
  }

  if (month === undefined) {
    return {
      gte: new Date(Date.UTC(year, 0, 1)),
      lt: new Date(Date.UTC(year + 1, 0, 1)),
    };
  }

  const gte = new Date(Date.UTC(year, month - 1, 1));
  const lt = new Date(Date.UTC(year, month, 1));
  return { gte, lt };
}
