interface TimeSlot {
  startHour: string;
  startMinute: string;
  startAmPm: "AM" | "PM";
  endHour: string;
  endMinute: string;
  endAmPm: "AM" | "PM";
  dayOfWeek: string;
  location: string;
  comments?: string;
}

interface TimeParseResult {
  success: boolean;
  timeSlot?: {
    startHour: string;
    startMinute: string;
    startAmPm: "AM" | "PM";
    endHour: string;
    endMinute: string;
    endAmPm: "AM" | "PM";
  };
}

/**
 * Orders an array of days of the week according to the standard sequence
 * starting with Monday and ending with Friday (excluding weekend days)
 * @param days Array of day names to sort (case insensitive)
 * @returns Ordered array of day names in the original case, with weekends filtered out
 */
export function orderDaysOfWeek(days: string[]): string[] {
  if (!days || days.length === 0) {
    return [];
  }

  const dayOrder: Record<string, number> = {
    'monday': 0,
    'tuesday': 1,
    'wednesday': 2,
    'thursday': 3,
    'friday': 4
  };

  // Filter out weekend days (Saturday and Sunday)
  const weekdaysOnly = days.filter(day => {
    const lowercase = day.toLowerCase();
    return lowercase !== 'saturday' && lowercase !== 'sunday';
  });

  // Create a copy of the array to avoid mutating the original
  return [...weekdaysOnly].sort((a, b) => {
    const aIndex = dayOrder[a.toLowerCase()] ?? 999; // Unknown days go to the end
    const bIndex = dayOrder[b.toLowerCase()] ?? 999;
    return aIndex - bIndex;
  });
}

/**
 * Parse a time string into hours, minutes, and AM/PM components
 * Returns an object with success status and the parsed time slot (if successful)
 */
export function parseTimeString(timeString: string): TimeParseResult {
  try {
    // Handle empty or invalid strings
    if (!timeString || timeString.trim() === "") {
      return { success: false };
    }
    
    // Strip any non-time related text
    const cleanedString = timeString.replace(/(?:office hours|hours|by appointment|or|and)/gi, '').trim();
    
    // Different time formats to handle
    
    // Check for military 24-hour format first (like "1400-1600" or "14:00-16:00")
    const militaryPattern = /(?:^|\D)(\d{1,2})(?:(\d{2})|:(\d{2}))?(?:[-–—to]+)(\d{1,2})(?:(\d{2})|:(\d{2}))?(?:$|\D)/;
    let match = cleanedString.match(militaryPattern);
    
    if (match) {
      const startHour = match[1];
      const startMinute = match[2] || match[3] || "00";
      const endHour = match[4];
      const endMinute = match[5] || match[6] || "00";
      
      // Only convert if it looks like 24-hour format
      if (parseInt(startHour, 10) > 12 || parseInt(endHour, 10) > 12) {
        const startHour24 = parseInt(startHour, 10);
        const endHour24 = parseInt(endHour, 10);
        
        // Convert to 12-hour format
        const startHour12 = (startHour24 % 12 === 0) ? 12 : startHour24 % 12;
        const endHour12 = (endHour24 % 12 === 0) ? 12 : endHour24 % 12;
        
        return {
          success: true,
          timeSlot: {
            startHour: startHour12.toString(),
            startMinute: startMinute,
            startAmPm: startHour24 < 12 ? "AM" : "PM" as "AM" | "PM",
            endHour: endHour12.toString(),
            endMinute: endMinute,
            endAmPm: endHour24 < 12 ? "AM" : "PM" as "AM" | "PM"
          }
        };
      }
    }
    
    // Format with spaces: 1:00 PM - 2:00 PM or 9:00 AM - 11:30 AM
    const spacedFormat = /(\d{1,2})(?::(\d{2}))?\s*([AP]\.?M\.?)(?:\s*[-–—to]\s*)(\d{1,2})(?::(\d{2}))?\s*([AP]\.?M\.?)/i;
    
    // Format: 2-4pm or 9am-5pm (compact format without spaces)
    const simplePeriod = /(\d{1,2})(?::(\d{2}))?([ap]\.?m\.?)(?:\s*[-–—to]\s*)(\d{1,2})(?::(\d{2}))?([ap]\.?m\.?)/i;
    
    // Format for 12-hour times with minutes: 9:30am-11:00am or 1:00pm-3:00pm
    const fullPeriod = /(\d{1,2}):(\d{2})(?:\s*)([ap]\.?m\.?)(?:\s*[-–—to]\s*)(\d{1,2}):(\d{2})(?:\s*)([ap]\.?m\.?)/i;
    
    // Format for time range on same AM/PM: 9-11 AM or 1-3 PM
    const sameAmPmRange = /(\d{1,2})(?::(\d{2}))?(?:\s*[-–—to]\s*)(\d{1,2})(?::(\d{2}))?\s*([AP]\.?M\.?)/i;
    
    // Try to match the different formats
    match = cleanedString.match(spacedFormat);
    if (match) {
      const startHour = match[1].replace(/^0+/, ''); // Remove leading zeros
      const startMinute = match[2] || "00";
      const startAmPm = match[3].toUpperCase().startsWith('A') ? "AM" : "PM" as "AM" | "PM";
      const endHour = match[4].replace(/^0+/, ''); // Remove leading zeros
      const endMinute = match[5] || "00";
      const endAmPm = match[6].toUpperCase().startsWith('A') ? "AM" : "PM" as "AM" | "PM";
      
      return {
        success: true,
        timeSlot: {
          startHour: startHour === "0" ? "12" : startHour,
          startMinute,
          startAmPm,
          endHour: endHour === "0" ? "12" : endHour,
          endMinute,
          endAmPm
        }
      };
    }
    
    match = cleanedString.match(fullPeriod);
    if (match) {
      const startHour = match[1].replace(/^0+/, ''); // Remove leading zeros
      const startMinute = match[2];
      const startAmPm = match[3].toUpperCase().startsWith('A') ? "AM" : "PM" as "AM" | "PM";
      const endHour = match[4].replace(/^0+/, ''); // Remove leading zeros
      const endMinute = match[5];
      const endAmPm = match[6].toUpperCase().startsWith('A') ? "AM" : "PM" as "AM" | "PM";
      
      return {
        success: true,
        timeSlot: {
          startHour: startHour === "0" ? "12" : startHour,
          startMinute,
          startAmPm,
          endHour: endHour === "0" ? "12" : endHour,
          endMinute,
          endAmPm
        }
      };
    }
    
    match = cleanedString.match(simplePeriod);
    if (match) {
      const startHour = match[1].replace(/^0+/, ''); // Remove leading zeros
      const startMinute = match[2] ? match[2] : "00";
      const startAmPm = match[3].toLowerCase().startsWith('a') ? "AM" : "PM" as "AM" | "PM";
      const endHour = match[4].replace(/^0+/, ''); // Remove leading zeros
      const endMinute = match[5] ? match[5] : "00";
      const endAmPm = match[6].toLowerCase().startsWith('a') ? "AM" : "PM" as "AM" | "PM";
      
      return {
        success: true,
        timeSlot: {
          startHour: startHour === "0" ? "12" : startHour,
          startMinute,
          startAmPm,
          endHour: endHour === "0" ? "12" : endHour,
          endMinute,
          endAmPm
        }
      };
    }
    
    match = cleanedString.match(sameAmPmRange);
    if (match) {
      const startHour = match[1].replace(/^0+/, ''); // Remove leading zeros
      const startMinute = match[2] || "00";
      const endHour = match[3].replace(/^0+/, ''); // Remove leading zeros
      const endMinute = match[4] || "00";
      const amPm = match[5].toUpperCase().startsWith('A') ? "AM" : "PM" as "AM" | "PM";
      
      return {
        success: true,
        timeSlot: {
          startHour: startHour === "0" ? "12" : startHour,
          startMinute,
          startAmPm: amPm,
          endHour: endHour === "0" ? "12" : endHour,
          endMinute,
          endAmPm: amPm
        }
      };
    }
    
    // Try to handle even more informal formats
    const timePattern = /(\d{1,2})(?::(\d{2}))?(?:\s*([ap]\.?m\.?))?/gi;
    const times = [];
    let timeMatch;
    
    while ((timeMatch = timePattern.exec(cleanedString)) !== null) {
      const hour = timeMatch[1].replace(/^0+/, ''); // Remove leading zeros
      const minute = timeMatch[2] || "00";
      let amPm = timeMatch[3]?.toLowerCase();
      
      // Default to AM for morning hours, PM for afternoon if not specified
      if (!amPm) {
        const hourNum = parseInt(hour, 10);
        amPm = hourNum < 8 || hourNum === 12 ? "pm" : "am";
      }
      
      times.push({
        hour: hour === "0" ? "12" : hour,
        minute,
        amPm: amPm.startsWith("a") ? "AM" : "PM"
      });
    }
    
    if (times.length >= 2) {
      return {
        success: true,
        timeSlot: {
          startHour: times[0].hour,
          startMinute: times[0].minute,
          startAmPm: times[0].amPm as "AM" | "PM",
          endHour: times[1].hour,
          endMinute: times[1].minute,
          endAmPm: times[1].amPm as "AM" | "PM"
        }
      };
    }
    
    // If no match found, return failed status with no timeSlot
    return { success: false };
  } catch (error) {
    console.warn('Error parsing time string:', error);
    return { success: false };
  }
} 

/**
 * Convert string days/times to structured time slots
 */
export function convertToTimeSlots(
  days: string[],
  timeString: string | null | undefined,
  location: string,
  comments?: string
): TimeSlot[] {
  // If no time information, return empty array
  if (!timeString || typeof timeString !== 'string' || timeString.trim() === "") {
    return [];
  }
  
  try {
    // Order the days of the week properly
    const orderedDays = orderDaysOfWeek(days);
    
    // Simple case: if we have explicit days and one time period
    if (orderedDays.length > 0 && !timeString.includes(',') && !timeString.includes(';')) {
      // Parse the time string (e.g., "2-4pm" or "14:00-16:00")
      const result = parseTimeString(timeString);
      
      // If parsing was successful, create a slot
      if (result.success && result.timeSlot) {
        return [{
          startHour: result.timeSlot.startHour,
          startMinute: result.timeSlot.startMinute,
          startAmPm: result.timeSlot.startAmPm,
          endHour: result.timeSlot.endHour,
          endMinute: result.timeSlot.endMinute,
          endAmPm: result.timeSlot.endAmPm,
          dayOfWeek: orderedDays.join('|'),
          comments: comments ? comments : "Weekly office hours",
          location: location || "Not specified"
        }];
      }
      
      // If parsing failed, return empty array
      return [];
    }
    
    // More complex case: try to parse from the time string itself
    // This would handle entries like "Monday 2-4pm, Wednesday 3-5pm" or "Monday: 2:00 PM - 4:00 PM; Tuesday: 2:00 PM - 4:00 PM"
    const slots: TimeSlot[] = [];
    
    // Split by commas or semicolons to get different time slots
    const timeSegments = timeString.split(/[,;]/).map(s => s.trim()).filter(s => s);
    
    for (const segment of timeSegments) {
      // Try to extract day and time
      const dayMatch = segment.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i);
      if (dayMatch) {
        const day = dayMatch[1];
        // Remove the day and any following colon/whitespace
        const timeSegmentWithoutDay = segment.substring(day.length).replace(/^[:.\s]+/, '').trim();
        const parsedTime = parseTimeString(timeSegmentWithoutDay);
        
        if (parsedTime.success && parsedTime.timeSlot) {
          slots.push({
            startHour: parsedTime.timeSlot.startHour,
            startMinute: parsedTime.timeSlot.startMinute,
            startAmPm: parsedTime.timeSlot.startAmPm,
            endHour: parsedTime.timeSlot.endHour,
            endMinute: parsedTime.timeSlot.endMinute,
            endAmPm: parsedTime.timeSlot.endAmPm,
            dayOfWeek: day,
            comments: comments ? comments : "Weekly office hours",
            location: location || "Not specified"
          });
        }
      } else {
        // If no day found, use the time as is
        const parsedTime = parseTimeString(segment);
        
        if (parsedTime.success && parsedTime.timeSlot) {
          slots.push({
            startHour: parsedTime.timeSlot.startHour,
            startMinute: parsedTime.timeSlot.startMinute,
            startAmPm: parsedTime.timeSlot.startAmPm,
            endHour: parsedTime.timeSlot.endHour,
            endMinute: parsedTime.timeSlot.endMinute,
            endAmPm: parsedTime.timeSlot.endAmPm,
            dayOfWeek: orderedDays.length > 0 ? orderedDays.join('|') : "Not specified",
            comments: comments ? comments : "Weekly office hours",
            location: location || "Not specified"
          });
        }
      }
    }
    
    // Order the slots by day of week before returning
    return slots.sort((a, b) => {
      const dayOrderA = getDayOrder(a.dayOfWeek);
      const dayOrderB = getDayOrder(b.dayOfWeek);
      return dayOrderA - dayOrderB;
    });
  } catch (error) {
    console.warn('Error parsing time slots:', error);
    // Return empty array instead of fallback values
    return [];
  }
}

/**
 * Helper function to get the order value of a day string
 * Used for sorting time slots by day of week
 * Only considers Monday through Friday (excludes weekends)
 */
export function getDayOrder(dayString: string): number {
  const dayOrder: Record<string, number> = {
    'monday': 0,
    'tuesday': 1,
    'wednesday': 2,
    'thursday': 3,
    'friday': 4
  };
  
  // Handle combined days (e.g., "Monday|Wednesday")
  if (dayString.includes('|')) {
    // Return the order of the first day in the list
    const firstDay = dayString.split('|')[0].toLowerCase();
    return dayOrder[firstDay] ?? 999;
  }
  
  return dayOrder[dayString.toLowerCase()] ?? 999;
}