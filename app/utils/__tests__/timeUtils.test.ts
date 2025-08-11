import { orderDaysOfWeek, parseTimeString, convertToTimeSlots } from '@/app/utils/timeUtils';

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

describe('convertToTimeSlots', () => {
  test('should handle complex time string with semicolon separators', () => {
    const timeString = "Monday: 2:00 PM - 4:00 PM; Tuesday: 2:00 PM - 4:00 PM; Wednesday: 2:00 PM - 4:00 PM; Thursday: 10:00 AM - 12:00 PM; Friday: 1:00 PM - 3:00 PM";
    const days: string[] = [];
    const location = "Office";
    const comments = "Office hours";
    
    const result = convertToTimeSlots(days, timeString, location, comments);
    
    expect(result).toHaveLength(5);
    
    // Check Monday
    expect(result[0]).toEqual({
      startHour: "2",
      startMinute: "00",
      startAmPm: "PM",
      endHour: "4",
      endMinute: "00",
      endAmPm: "PM",
      dayOfWeek: "Monday",
      comments: "Office hours",
      location: "Office"
    });
    
    // Check Tuesday
    expect(result[1]).toEqual({
      startHour: "2",
      startMinute: "00",
      startAmPm: "PM",
      endHour: "4",
      endMinute: "00",
      endAmPm: "PM",
      dayOfWeek: "Tuesday",
      comments: "Office hours",
      location: "Office"
    });
    
    // Check Wednesday
    expect(result[2]).toEqual({
      startHour: "2",
      startMinute: "00",
      startAmPm: "PM",
      endHour: "4",
      endMinute: "00",
      endAmPm: "PM",
      dayOfWeek: "Wednesday",
      comments: "Office hours",
      location: "Office"
    });
    
    // Check Thursday
    expect(result[3]).toEqual({
      startHour: "10",
      startMinute: "00",
      startAmPm: "AM",
      endHour: "12",
      endMinute: "00",
      endAmPm: "PM",
      dayOfWeek: "Thursday",
      comments: "Office hours",
      location: "Office"
    });
    
    // Check Friday
    expect(result[4]).toEqual({
      startHour: "1",
      startMinute: "00",
      startAmPm: "PM",
      endHour: "3",
      endMinute: "00",
      endAmPm: "PM",
      dayOfWeek: "Friday",
      comments: "Office hours",
      location: "Office"
    });
  });
  
  test('should handle simple case with explicit days and one time period', () => {
    const timeString = "2:00 PM - 4:00 PM";
    const days = ["Monday", "Tuesday", "Wednesday"];
    const location = "Office";
    const comments = "Office hours";
    
    const result = convertToTimeSlots(days, timeString, location, comments);
    
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      startHour: "2",
      startMinute: "00",
      startAmPm: "PM",
      endHour: "4",
      endMinute: "00",
      endAmPm: "PM",
      dayOfWeek: "Monday|Tuesday|Wednesday",
      comments: "Office hours",
      location: "Office"
    });
  });
  
  test('should return empty array for invalid time string', () => {
    const timeString = "";
    const days = ["Monday", "Tuesday"];
    const location = "Office";
    
    const result = convertToTimeSlots(days, timeString, location);
    
    expect(result).toHaveLength(0);
  });
}); 