import { orderDaysOfWeek, parseTimeString } from '@/app/utils/timeUtils';

describe('orderDaysOfWeek', () => {
  test('should return an empty array when given an empty array', () => {
    expect(orderDaysOfWeek([])).toEqual([]);
  });

  test('should return an empty array when given null or undefined', () => {
    // @ts-ignore - testing null/undefined handling
    expect(orderDaysOfWeek(null)).toEqual([]);
    // @ts-ignore - testing null/undefined handling
    expect(orderDaysOfWeek(undefined)).toEqual([]);
  });

  test('should correctly order weekdays when they are out of sequence', () => {
    const unordered = ['Friday', 'Monday', 'Wednesday'];
    const expected = ['Monday', 'Wednesday', 'Friday'];
    expect(orderDaysOfWeek(unordered)).toEqual(expected);
  });

  test('should maintain the ordering when weekdays are already in sequence', () => {
    const ordered = ['Monday', 'Tuesday', 'Wednesday'];
    expect(orderDaysOfWeek(ordered)).toEqual(ordered);
  });

  test('should filter out weekend days', () => {
    const withWeekends = ['Monday', 'Saturday', 'Wednesday', 'Sunday', 'Friday'];
    const expected = ['Monday', 'Wednesday', 'Friday'];
    expect(orderDaysOfWeek(withWeekends)).toEqual(expected);
  });

  test('should handle case-insensitive day names', () => {
    const mixedCase = ['friday', 'Monday', 'WEDNESDAY'];
    const expected = ['Monday', 'WEDNESDAY', 'friday'];
    expect(orderDaysOfWeek(mixedCase)).toEqual(expected);
  });

  test('should handle a single weekday', () => {
    expect(orderDaysOfWeek(['Thursday'])).toEqual(['Thursday']);
  });

  test('should handle a single weekend day by returning empty array', () => {
    expect(orderDaysOfWeek(['Sunday'])).toEqual([]);
  });

  test('should handle all five weekdays in mixed order', () => {
    const allWeekdays = ['Friday', 'Tuesday', 'Monday', 'Thursday', 'Wednesday'];
    const expected = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    expect(orderDaysOfWeek(allWeekdays)).toEqual(expected);
  });

  test('should place unknown days at the end', () => {
    const withUnknown = ['Friday', 'Someday', 'Monday', 'Holiday'];
    const expected = ['Monday', 'Friday', 'Someday', 'Holiday'];
    expect(orderDaysOfWeek(withUnknown)).toEqual(expected);
  });

  test('should handle abbreviated day names', () => {
    // Note: The function doesn't currently handle abbreviations differently
    // but we're testing the behavior to document it
    const abbreviated = ['Mon', 'Wed', 'Fri'];
    // Since these don't match the full day names, they'll be treated as unknown
    expect(orderDaysOfWeek(abbreviated)).toEqual(abbreviated);
  });

  test('should return empty array if only weekend days are provided', () => {
    expect(orderDaysOfWeek(['Saturday', 'Sunday'])).toEqual([]);
  });

  test('should handle mixed weekend, weekday and unknown days', () => {
    const mixed = ['Sunday', 'Monday', 'Holiday', 'Saturday', 'Friday'];
    const expected = ['Monday', 'Friday', 'Holiday'];
    expect(orderDaysOfWeek(mixed)).toEqual(expected);
  });
}); 