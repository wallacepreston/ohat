import { parseTimeString } from './timeUtils';

describe('parseTimeString function', () => {
  it('should handle the format "1:00 PM - 2:00 PM" with spaces', () => {
    const result = parseTimeString('1:00 PM - 2:00 PM');
    expect(result.success).toBe(true);
    expect(result.timeSlot).toEqual({
      startHour: "1",
      startMinute: "00",
      startAmPm: "PM",
      endHour: "2",
      endMinute: "00",
      endAmPm: "PM"
    });
  });

  it('should handle the format "9:00 AM - 11:30 AM" with spaces', () => {
    const result = parseTimeString('9:00 AM - 11:30 AM');
    expect(result.success).toBe(true);
    expect(result.timeSlot).toEqual({
      startHour: "9",
      startMinute: "00",
      startAmPm: "AM",
      endHour: "11",
      endMinute: "30",
      endAmPm: "AM"
    });
  });

  it('should handle the format without spaces "2-4pm"', () => {
    const result = parseTimeString('2-4pm');
    expect(result.success).toBe(true);
    expect(result.timeSlot).toEqual({
      startHour: "2",
      startMinute: "00",
      startAmPm: "PM",
      endHour: "4",
      endMinute: "00",
      endAmPm: "PM"
    });
  });

  it('should handle the format "9am-5pm" without spaces', () => {
    const result = parseTimeString('9am-5pm');
    expect(result.success).toBe(true);
    expect(result.timeSlot).toEqual({
      startHour: "9",
      startMinute: "00",
      startAmPm: "AM",
      endHour: "5",
      endMinute: "00",
      endAmPm: "PM"
    });
  });

  it('should handle the format "9:30am-11:00am" with minutes', () => {
    const result = parseTimeString('9:30am-11:00am');
    expect(result.success).toBe(true);
    expect(result.timeSlot).toEqual({
      startHour: "9",
      startMinute: "30",
      startAmPm: "AM",
      endHour: "11",
      endMinute: "00",
      endAmPm: "AM"
    });
  });

  it('should handle the format "1:00pm-3:00pm" with minutes', () => {
    const result = parseTimeString('1:00pm-3:00pm');
    expect(result.success).toBe(true);
    expect(result.timeSlot).toEqual({
      startHour: "1",
      startMinute: "00",
      startAmPm: "PM",
      endHour: "3",
      endMinute: "00",
      endAmPm: "PM"
    });
  });

  it('should handle the format "9-11 AM" with same AM/PM', () => {
    const result = parseTimeString('9-11 AM');
    expect(result.success).toBe(true);
    expect(result.timeSlot).toEqual({
      startHour: "9",
      startMinute: "00",
      startAmPm: "AM",
      endHour: "11",
      endMinute: "00",
      endAmPm: "AM"
    });
  });

  it('should handle the format "1-3 PM" with same AM/PM', () => {
    const result = parseTimeString('1-3 PM');
    expect(result.success).toBe(true);
    expect(result.timeSlot).toEqual({
      startHour: "1",
      startMinute: "00",
      startAmPm: "PM",
      endHour: "3",
      endMinute: "00",
      endAmPm: "PM"
    });
  });

  it('should handle the format with extra text "Office hours 1-3 PM"', () => {
    const result = parseTimeString('Office hours 1-3 PM');
    expect(result.success).toBe(true);
    expect(result.timeSlot).toEqual({
      startHour: "1",
      startMinute: "00",
      startAmPm: "PM",
      endHour: "3",
      endMinute: "00",
      endAmPm: "PM"
    });
  });

  it('should handle the format with different formats in between of times "1pm to 3:00 PM"', () => {
    const result = parseTimeString('1pm to 3:00 PM');
    expect(result.success).toBe(true);
    expect(result.timeSlot).toEqual({
      startHour: "1",
      startMinute: "00",
      startAmPm: "PM",
      endHour: "3",
      endMinute: "00",
      endAmPm: "PM"
    });
  });

  it('should handle informal time mentions "1 and 3"', () => {
    const result = parseTimeString('1 and 3');
    expect(result.success).toBe(true);
    expect(result.timeSlot).toEqual({
      startHour: "1",
      startMinute: "00",
      startAmPm: "PM", // Default for 1 is PM
      endHour: "3",
      endMinute: "00",
      endAmPm: "PM" // Default for 3 is PM
    });
  });

  it('should handle zero-padding in hours "01:00 PM - 02:00 PM"', () => {
    const result = parseTimeString('01:00 PM - 02:00 PM');
    expect(result.success).toBe(true);
    expect(result.timeSlot).toEqual({
      startHour: "1",
      startMinute: "00",
      startAmPm: "PM",
      endHour: "2",
      endMinute: "00",
      endAmPm: "PM"
    });
  });

  it('should handle empty strings', () => {
    const result = parseTimeString('');
    expect(result.success).toBe(false);
    expect(result.timeSlot).toBeUndefined();
  });

  it('should handle invalid time strings with no timeSlot', () => {
    const result = parseTimeString('no time here');
    expect(result.success).toBe(false);
    expect(result.timeSlot).toBeUndefined();
  });

  it('should handle 24-hour format "13:00-15:00"', () => {
    const result = parseTimeString('13:00-15:00');
    expect(result.success).toBe(true);
    expect(result.timeSlot).toEqual({
      startHour: "1",
      startMinute: "00",
      startAmPm: "PM", // 13 = 1 PM
      endHour: "3",
      endMinute: "00",
      endAmPm: "PM" // 15 = 3 PM
    });
  });

  it('should handle mixed formats "9am to 5 in the evening"', () => {
    const result = parseTimeString('9am to 5 in the evening');
    // In this case, we should detect 9am and 5, and assume 5 is PM
    expect(result.success).toBe(true);
    expect(result.timeSlot).toEqual({
      startHour: "9",
      startMinute: "00",
      startAmPm: "AM",
      endHour: "5",
      endMinute: "00",
      endAmPm: "PM"
    });
  });
}); 