import { toDateRange } from './date-range.js';

describe('toDateRange', () => {
  it('returns undefined when no year is given', () => {
    expect(toDateRange()).toBeUndefined();
  });

  it('returns the full year range when only year is given', () => {
    expect(toDateRange(2026)).toEqual({
      gte: new Date('2026-01-01T00:00:00.000Z'),
      lt: new Date('2027-01-01T00:00:00.000Z'),
    });
  });

  it('returns the month range for a regular month', () => {
    expect(toDateRange(2026, 9)).toEqual({
      gte: new Date('2026-09-01T00:00:00.000Z'),
      lt: new Date('2026-10-01T00:00:00.000Z'),
    });
  });

  it('rolls over into the next year for December', () => {
    expect(toDateRange(2026, 12)).toEqual({
      gte: new Date('2026-12-01T00:00:00.000Z'),
      lt: new Date('2027-01-01T00:00:00.000Z'),
    });
  });
});
