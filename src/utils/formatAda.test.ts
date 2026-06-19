import { formatAdaCompact, formatAdaExact } from './formatAda';

describe('formatAdaCompact', () => {
  it('formats billions with one decimal when needed', () => {
    expect(formatAdaCompact(1_200_000_000 * 1_000_000)).toBe('₳1.2B');
  });

  it('formats whole billions without decimal', () => {
    expect(formatAdaCompact(2_000_000_000 * 1_000_000)).toBe('₳2B');
  });

  it('formats millions', () => {
    expect(formatAdaCompact(70_000_000 * 1_000_000)).toBe('₳70M');
  });

  it('formats thousands with one decimal when needed', () => {
    expect(formatAdaCompact(6_300 * 1_000_000)).toBe('₳6.3K');
  });

  it('formats whole ADA below 1K', () => {
    expect(formatAdaCompact(500 * 1_000_000)).toBe('₳500');
  });

  it('formats zero', () => {
    expect(formatAdaCompact(0)).toBe('₳0');
  });
});

describe('formatAdaExact', () => {
  it('formats with locale grouping', () => {
    expect(formatAdaExact(12_345_678 * 1_000_000)).toBe('₳12,345,678');
  });
});
