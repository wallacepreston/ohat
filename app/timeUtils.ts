interface TimeSlot {
  startHour: string;
  startMinute: string;
  startAmPm: "AM" | "PM";
  endHour: string;
  endMinute: string;
  endAmPm: "AM" | "PM";
}

interface TimeParseResult {
  success: boolean;
  timeSlot?: TimeSlot;
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