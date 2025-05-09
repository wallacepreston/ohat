import { OfficeHoursStatus } from "@/types/salesforce";

/**
 * Determines the result status based on available office hours and teaching information.
 * 
 * Status logic:
 * - SUCCESS: Complete office hours information (with or without teaching info)
 * - PARTIAL_SUCCESS: Either partial office hours or any teaching info
 * - NOT_FOUND: No information at all
 */
export function determineResultStatus(result: any): OfficeHoursStatus {
  const unacceptableValues = [
    "not specified", "not specified.", "not specified..", "not specified...", 
    "not found", "not found.", "not found..", "not found...",
    "not explicitly stated", "not explicitly specified", "not clearly stated",
    "not provided", "not mentioned", "not stated", "not listed",
    "unclear", "unknown", "unavailable", "to be determined", "tbd",
    "not available", "contact for details", "contact instructor", "email for details"
  ];
  
  // Check if values are valid (not empty and not in unacceptable values list)
  const isValidValue = (value: string) => {
    if (!value || value.trim() === "") return false;
    
    const lowercaseValue = value.trim().toLowerCase();
    
    // Exact matches with unacceptable values
    if (unacceptableValues.includes(lowercaseValue)) return false;
    
    // Check for patterns that suggest vague/indeterminate values
    if (unacceptableValues.some(badValue => lowercaseValue.includes(badValue))) return false;
    
    // Check for vague descriptions without specific times
    if (lowercaseValue.includes("but it states") || 
        lowercaseValue.includes("but states") ||
        lowercaseValue.includes("but mentioned")) return false;
    
    return true;
  };

  const hasOfficeHours = isValidValue(result.times);
  const hasOfficeLocation = isValidValue(result.location);
  const hasTeachingHours = isValidValue(result.teachingHours);
  const hasTeachingLocation = isValidValue(result.teachingLocation);
  
  // Complete office hours info requires both time and location
  const hasCompleteOfficeHours = hasOfficeHours && hasOfficeLocation;
  
  // Complete teaching info requires both time and location
  const hasCompleteTeachingHours = hasTeachingHours && hasTeachingLocation;
  
  // If we have both complete office hours and complete teaching hours, it's SUCCESS
  if (hasCompleteOfficeHours && hasCompleteTeachingHours) {
    return OfficeHoursStatus.SUCCESS;
  } 
  // If we have complete office hours (even without teaching hours), it's SUCCESS
  else if (hasCompleteOfficeHours) {
    return OfficeHoursStatus.SUCCESS;
  }
  // If we have any valid information (partial office hours or any teaching info), it's PARTIAL_SUCCESS
  else if (hasOfficeHours || hasOfficeLocation || hasTeachingHours || hasTeachingLocation) {
    return OfficeHoursStatus.PARTIAL_SUCCESS;
  }
  // If we have no information at all, it's NOT_FOUND
  else {
    return OfficeHoursStatus.NOT_FOUND;
  }
}

/**
 * Helper function to validate and correct result status
 * Ensures that results with missing office hours or teaching hours are marked as PARTIAL_SUCCESS
 */
export function validateResultStatus(results: any[]): any[] {
  return results.map(result => {
    if (result.teachingHours && result.teachingHours.length > 0 && result.officeHours && result.officeHours.length > 0) {
      result.status = "SUCCESS";
    }
    else if (result.teachingHours && result.teachingHours.length > 0) {
      result.status = "PARTIAL_SUCCESS";
    }
    else if (result.officeHours && result.officeHours.length > 0) {
      result.status = "PARTIAL_SUCCESS";
    }
    else {
      result.status = "NOT_FOUND";
    }
    return result;
  });
}