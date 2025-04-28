import { 
  BatchRequest, 
  BatchResponse, 
  ProcessedOfficeHours,
  OfficeHoursStatus,
  BatchRequestInstructor
} from "@/types/salesforce";

/**
 * Process a batch of instructors using the batch API
 */
export async function processBatchOfficeHours(
  batchRequest: BatchRequest
): Promise<BatchResponse> {
  try {
    const response = await fetch('/api/office-hours', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batchRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error processing batch:', error);
    throw error;
  }
}

/**
 * Convert batch response to the legacy ProcessedOfficeHours format
 * This allows existing components to display the results from the batch API
 */
export function convertBatchResponseToLegacy(
  response: BatchResponse,
  batchRequest?: BatchRequest
): ProcessedOfficeHours[] {
  const results: ProcessedOfficeHours[] = [];
  
  // Create a map of contactId to instructor name/info from the batch request
  const instructorMap = new Map<string, BatchRequestInstructor>();
  
  if (batchRequest) {
    batchRequest.instructors.forEach(instructor => {
      instructorMap.set(instructor.contactId, instructor);
    });
  }
  
  // Process successful results
  for (const result of response.results) {
    // Extract days from time slots
    const days = result.officeHours
      .map(slot => slot.dayOfWeek.split('|'))
      .flat()
      .filter((day, index, self) => self.indexOf(day) === index);
    
    // Format time string
    const times = result.officeHours
      .map(slot => {
        const dayPrefix = slot.dayOfWeek.includes('|') ? '' : `${slot.dayOfWeek} `;
        return `${dayPrefix}${slot.startHour}:${slot.startMinute}${slot.startAmPm}-${slot.endHour}:${slot.endMinute}${slot.endAmPm}`;
      })
      .join(', ');
    
    // Get location
    const location = result.officeHours.length > 0 ? 
      result.officeHours.map(slot => slot.location).join(', ') : 
      '';
    
    // Format teaching hours
    const teachingHours = result.teachingHours
      .map(slot => {
        const dayPrefix = slot.dayOfWeek.includes('|') ? '' : `${slot.dayOfWeek} `;
        return `${dayPrefix}${slot.startHour}:${slot.startMinute}${slot.startAmPm}-${slot.endHour}:${slot.endMinute}${slot.endAmPm}`;
      })
      .join(', ');
    
    // Get teaching location
    const teachingLocation = result.teachingHours.length > 0 ? 
      result.teachingHours.map(slot => slot.location).join(', ') : 
      '';
    
    // Find the instructor information using the map
    const instructorInfo = instructorMap.get(result.contactId);
    
    results.push({
      instructor: instructorInfo ? instructorInfo.name : result.contactId,
      email: instructorInfo ? instructorInfo.email : "",
      institution: batchRequest ? batchRequest.institution : "",
      course: instructorInfo ? instructorInfo.department : "",
      days,
      times,
      location,
      teachingHours,
      teachingLocation,
      term: getCurrentSeason() + ' ' + new Date().getFullYear(),
      status: result.status === "SUCCESS" ? OfficeHoursStatus.FOUND : OfficeHoursStatus.PARTIAL_INFO_FOUND,
      validatedBy: result.source
    });
  }
  
  // Process exceptions
  for (const exception of response.exceptions) {
    // Find the instructor information using the map
    const instructorInfo = instructorMap.get(exception.contactId);
    
    results.push({
      instructor: instructorInfo ? instructorInfo.name : exception.contactId,
      email: instructorInfo ? instructorInfo.email : "",
      institution: batchRequest ? batchRequest.institution : "",
      course: instructorInfo ? instructorInfo.department : "",
      days: [],
      times: "",
      location: "",
      teachingHours: "",
      teachingLocation: "",
      term: getCurrentSeason() + ' ' + new Date().getFullYear(),
      status: exception.status === "ERROR" ? OfficeHoursStatus.ERROR : OfficeHoursStatus.NOT_FOUND,
      validatedBy: null
    });
  }
  
  return results;
}

/**
 * Convert legacy data format to batch request format
 */
export function convertLegacyToBatchRequest(
  data: any[],
  batchId = `batch-${Date.now()}`
): BatchRequest {
  // Extract institution from the first item if all institutions are the same
  const institutions = new Set(data.map(item => item.Account_Name__c).filter(Boolean));
  const institution = institutions.size === 1 ? 
    Array.from(institutions)[0] : 
    "Multiple Institutions";
  
  // Extract account ID from the first item
  const accountId = data[0]?.Account_ID__c || `acc-${Date.now()}`;
  
  // Convert instructors
  const instructors = data.map(item => ({
    contactId: item.Contact_ID__c || item.ID || item.Contact_Name__c || `contact-${Math.random().toString(36).substring(2, 11)}`,
    name: item.Contact_Name__c || "Unknown",
    email: item.Contact_Email__c || "",
    department: item.School_Course_Name__c || item.Division || "",
    isKeyDecisionMaker: item.Decision_Maker_Type__c === "YES"
  }));
  
  return {
    accountId,
    batchId,
    institution,
    instructors
  };
}

/**
 * Process a photo upload with associated instructor data
 */
export async function processPhotoUpload(
  salesforceData: any,
  photo: File
): Promise<ProcessedOfficeHours[]> {
  try {
    // Create a FormData object to send the photo and data
    const formData = new FormData();
    
    // Add the photo file
    formData.append('photo', photo);
    
    // Add the Salesforce data as JSON
    formData.append('salesforceData', JSON.stringify(salesforceData));
    
    // Send the request to our API endpoint
    const response = await fetch('/api/photo-upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error processing photo upload:', error);
    throw error;
  }
}

/**
 * Helper function to get current season
 */
function getCurrentSeason(): string {
  const currentMonth = new Date().getMonth();
  // JavaScript months are 0-indexed (0 = January, 11 = December)
  if (currentMonth >= 2 && currentMonth <= 4) return "Spring";
  if (currentMonth >= 5 && currentMonth <= 7) return "Summer";
  if (currentMonth >= 8 && currentMonth <= 10) return "Fall";
  return "Winter"; // Dec (11), Jan (0), Feb (1)
} 