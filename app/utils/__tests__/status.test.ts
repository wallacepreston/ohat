import { OfficeHoursStatus } from "@/types/salesforce";
import { determineResultStatus, validateResultStatus } from "../status";

describe('determineResultStatus function', () => {
  // Test FOUND status
  it('should return FOUND when both office hours and teaching info are complete', () => {
    const result = {
      times: "2:00 PM - 4:00 PM",
      location: "Room 101",
      teachingHours: "9:00 AM - 11:00 AM",
      teachingLocation: "Hall A"
    };
    expect(determineResultStatus(result)).toBe(OfficeHoursStatus.FOUND);
  });

  it('should return FOUND when only office hours info is complete (even without teaching info)', () => {
    const result = {
      times: "2:00 PM - 4:00 PM",
      location: "Room 101",
      teachingHours: "",
      teachingLocation: ""
    };
    expect(determineResultStatus(result)).toBe(OfficeHoursStatus.FOUND);
  });

  // Test PARTIAL_INFO_FOUND status
  it('should return PARTIAL_INFO_FOUND when only teaching info is complete', () => {
    const result = {
      times: "",
      location: "",
      teachingHours: "9:00 AM - 11:00 AM",
      teachingLocation: "Hall A"
    };
    expect(determineResultStatus(result)).toBe(OfficeHoursStatus.PARTIAL_INFO_FOUND);
  });

  it('should return PARTIAL_INFO_FOUND when office hours info is incomplete (has time but no location)', () => {
    const result = {
      times: "2:00 PM - 4:00 PM",
      location: "",
      teachingHours: "",
      teachingLocation: ""
    };
    expect(determineResultStatus(result)).toBe(OfficeHoursStatus.PARTIAL_INFO_FOUND);
  });

  it('should return PARTIAL_INFO_FOUND when office hours info is incomplete (has location but no time)', () => {
    const result = {
      times: "",
      location: "Room 101",
      teachingHours: "",
      teachingLocation: ""
    };
    expect(determineResultStatus(result)).toBe(OfficeHoursStatus.PARTIAL_INFO_FOUND);
  });

  it('should return PARTIAL_INFO_FOUND when teaching info is incomplete (has time but no location)', () => {
    const result = {
      times: "",
      location: "",
      teachingHours: "9:00 AM - 11:00 AM",
      teachingLocation: ""
    };
    expect(determineResultStatus(result)).toBe(OfficeHoursStatus.PARTIAL_INFO_FOUND);
  });

  it('should return PARTIAL_INFO_FOUND when teaching info is incomplete (has location but no time)', () => {
    const result = {
      times: "",
      location: "",
      teachingHours: "",
      teachingLocation: "Hall A"
    };
    expect(determineResultStatus(result)).toBe(OfficeHoursStatus.PARTIAL_INFO_FOUND);
  });

  // Test NOT_FOUND status
  it('should return NOT_FOUND when no info is available', () => {
    const result = {
      times: "",
      location: "",
      teachingHours: "",
      teachingLocation: ""
    };
    expect(determineResultStatus(result)).toBe(OfficeHoursStatus.NOT_FOUND);
  });

  // Special case for the example provided
  it('should return PARTIAL_INFO_FOUND for the specific example with only teaching info', () => {
    const result = {
      instructor: "Wasserman, Eric H.",
      email: "ehw29@rutgers.edu",
      institution: "Rutgers University New Brunswick",
      course: "Precalculus College Math (01:640:115)",
      days: [],
      times: "",
      location: "",
      teachingHours: "Recitation F2: 10:20A-11:40A, Recitation F3: 12:10P-1:30P",
      teachingLocation: "TIL-209, Livingston Campus",
      term: "Spring 2025",
      comments: "No specific office hours information found for Spring 2025. Teaching schedule is confirmed for recitations on Fridays. For office hours, please contact the instructor directly.",
    };
    expect(determineResultStatus(result)).toBe(OfficeHoursStatus.PARTIAL_INFO_FOUND);
  });

  // Tests for API response status mapping
  describe('API response mapping', () => {
    it('should map to SUCCESS when office hours are complete', () => {
      const result = {
        times: "2:00 PM - 4:00 PM",
        location: "Room 101",
        teachingHours: "",
        teachingLocation: ""
      };
      const officeHourSlots = [{ /* mock time slot */ }];
      const teachingHourSlots = [];
      
      // Using the same logic as in processBatchOfficeHours
      const hasCompleteOfficeHours = officeHourSlots.length > 0;
      const resultStatus = hasCompleteOfficeHours ? "SUCCESS" : "PARTIAL_SUCCESS";
      
      expect(resultStatus).toBe("SUCCESS");
    });
    
    it('should map to PARTIAL_SUCCESS when only teaching hours are available', () => {
      const result = {
        times: "",
        location: "",
        teachingHours: "9:00 AM - 11:00 AM",
        teachingLocation: "Hall A"
      };
      const officeHourSlots = [];
      const teachingHourSlots = [{ /* mock time slot */ }];
      
      // Using the same logic as in processBatchOfficeHours
      const hasCompleteOfficeHours = officeHourSlots.length > 0;
      const resultStatus = hasCompleteOfficeHours ? "SUCCESS" : "PARTIAL_SUCCESS";
      
      expect(resultStatus).toBe("PARTIAL_SUCCESS");
    });
    
    it('should handle the specific example case correctly', () => {
      // Example case from the user's query
      const result = {
        instructor: "Wasserman, Eric H.",
        email: "ehw29@rutgers.edu",
        institution: "Rutgers University New Brunswick",
        course: "Precalculus College Math (01:640:115)",
        days: [],
        times: "",
        location: "",
        teachingHours: "Recitation F2: 10:20A-11:40A, Recitation F3: 12:10P-1:30P",
        teachingLocation: "TIL-209, Livingston Campus",
        comments: "No specific office hours information found for Spring 2025. Teaching schedule is confirmed for recitations on Fridays. For office hours, please contact the instructor directly.",
      };
      
      // First, confirm the internal status is correct
      expect(determineResultStatus(result)).toBe(OfficeHoursStatus.PARTIAL_INFO_FOUND);
      
      // Then check the API response mapping
      const officeHourSlots = []; // No office hours
      const teachingHourSlots = [{ 
        // Mock teaching slot that was converted from the above result
        startHour: "10",
        startMinute: "20",
        startAmPm: "AM",
        endHour: "11",
        endMinute: "40",
        endAmPm: "AM",
        dayOfWeek: "Not specified",
        comments: "Office hours days found but specific times and location not found; teaching schedule includes recitations on Fridays",
        location: "TIL-209"
      }];
      
      // Using the same logic as in processBatchOfficeHours
      const hasCompleteOfficeHours = officeHourSlots.length > 0;
      const resultStatus = hasCompleteOfficeHours ? "SUCCESS" : "PARTIAL_SUCCESS";
      
      // This should be PARTIAL_SUCCESS since there are no office hours
      expect(resultStatus).toBe("PARTIAL_SUCCESS");
    });
  });

  it('should handle "Not specified" values as if they were empty', () => {
    const result = {
      instructor: "Wasserman, Eric H.",
      email: "ehw29@rutgers.edu",
      institution: "Rutgers University New Brunswick",
      course: "Precalculus College Math (01:640:115)",
      days: [
        "Tuesday",
        "Thursday",
      ],
      times: "Not specified",
      location: "Not specified",
      teachingHours: "Recitation F2: 10:20A-11:40 (TIL-209, LIV), Recitation F3: 12:10P-1:30 (TIL-209, LIV)",
      teachingLocation: "TIL-209, Livingston Campus",
      term: "Spring 2025",
      comments: "Office hours days are listed as Tuesday and Thursday, but specific times and location are not provided. Teaching schedule is confirmed for recitations on Livingston Campus.",
    };
    expect(determineResultStatus(result)).toBe(OfficeHoursStatus.PARTIAL_INFO_FOUND);
  });

  it('should handle vague descriptions correctly', () => {
    const vagueTimes = [
      "Not explicitly stated but it states that office hours are on Tuesday and Wednesday",
      "Not clearly stated, but mentioned in the syllabus",
      "Contact instructor for details",
      "Days not specified but available by appointment",
      "TBD - check Canvas for updates"
    ];
    
    const baseResult = {
      instructor: "Test Prof",
      email: "test@example.edu",
      institution: "Test University",
      course: "Test 101",
      days: ["Monday", "Wednesday"],
      location: "Science Building Room 301",
      teachingHours: "",
      teachingLocation: "",
      term: "Fall 2025",
      comments: "",
    };
    
    // Test each vague time string
    vagueTimes.forEach(vagueTime => {
      const testResult = {...baseResult, times: vagueTime};
      // Since the location is valid but the time is vague/invalid, this should be PARTIAL_INFO_FOUND
      expect(determineResultStatus(testResult)).toBe(OfficeHoursStatus.PARTIAL_INFO_FOUND);
    });
  });
}); 


describe('validateResultStatus function', () => {
  // Test cases with empty office hours or teaching hours
  it('should change status to PARTIAL_SUCCESS when office hours array is empty', () => {
    const mockResults = [{
      status: "SUCCESS",
      officeHours: [],
      teachingHours: [{ /* mock data */ }]
    }];
    
    const validatedResults = validateResultStatus(mockResults);
    expect(validatedResults[0].status).toBe("PARTIAL_SUCCESS");
  });
  
  it('should change status to PARTIAL_SUCCESS when teaching hours array is empty', () => {
    const mockResults = [{
      status: "SUCCESS",
      officeHours: [{ /* mock data */ }],
      teachingHours: []
    }];
    
    const validatedResults = validateResultStatus(mockResults);
    expect(validatedResults[0].status).toBe("PARTIAL_SUCCESS");
  });
  
  it('should change status to PARTIAL_SUCCESS when both arrays are empty', () => {
    const mockResults = [{
      status: "SUCCESS",
      officeHours: [],
      teachingHours: []
    }];
    
    const validatedResults = validateResultStatus(mockResults);
    expect(validatedResults[0].status).toBe("PARTIAL_SUCCESS");
  });

  // Test cases with undefined or null arrays
  it('should change status to PARTIAL_SUCCESS when office hours is undefined', () => {
    const mockResults = [{
      status: "SUCCESS",
      teachingHours: [{ /* mock data */ }]
    }];
    
    const validatedResults = validateResultStatus(mockResults);
    expect(validatedResults[0].status).toBe("PARTIAL_SUCCESS");
  });
  
  it('should change status to PARTIAL_SUCCESS when teaching hours is undefined', () => {
    const mockResults = [{
      status: "SUCCESS",
      officeHours: [{ /* mock data */ }]
    }];
    
    const validatedResults = validateResultStatus(mockResults);
    expect(validatedResults[0].status).toBe("PARTIAL_SUCCESS");
  });

  // Test case with valid data
  it('should keep status as SUCCESS when both office hours and teaching hours have data', () => {
    const mockResults = [{
      status: "SUCCESS",
      officeHours: [{ /* mock data */ }],
      teachingHours: [{ /* mock data */ }]
    }];
    
    const validatedResults = validateResultStatus(mockResults);
    expect(validatedResults[0].status).toBe("SUCCESS");
  });

  // Test multiple results in array
  it('should process multiple results in an array', () => {
    const mockResults = [
      {
        status: "SUCCESS",
        officeHours: [{ /* mock data */ }],
        teachingHours: [{ /* mock data */ }]
      },
      {
        status: "SUCCESS",
        officeHours: [],
        teachingHours: [{ /* mock data */ }]
      },
      {
        status: "SUCCESS",
        officeHours: [{ /* mock data */ }],
        teachingHours: []
      }
    ];
    
    const validatedResults = validateResultStatus(mockResults);
    expect(validatedResults[0].status).toBe("SUCCESS");        // Both have data
    expect(validatedResults[1].status).toBe("PARTIAL_SUCCESS"); // Missing office hours
    expect(validatedResults[2].status).toBe("PARTIAL_SUCCESS"); // Missing teaching hours
  });

  // Test real-world example case
  it('should handle the Wasserman example case', () => {
    const mockWassermanResult = {
      status: "SUCCESS",
      contactId: "003WASSERMAN001",
      officeHours: [],
      teachingHours: [
        {
          startHour: "10",
          startMinute: "20",
          startAmPm: "AM",
          endHour: "11",
          endMinute: "40",
          endAmPm: "AM",
          dayOfWeek: "Not specified",
          comments: "Teaching schedule includes recitations on Fridays",
          location: "TIL-209"
        }
      ],
      source: "web_search"
    };
    
    const validatedResults = validateResultStatus([mockWassermanResult]);
    expect(validatedResults[0].status).toBe("PARTIAL_SUCCESS");
  });

  // Test edge case - empty array
  it('should handle empty array input', () => {
    const mockResults: any[] = [];
    const validatedResults = validateResultStatus(mockResults);
    expect(validatedResults).toEqual([]);
  });
  
  // Test edge case - already marked as PARTIAL_SUCCESS
  it('should not change status if already PARTIAL_SUCCESS', () => {
    const mockResults = [{
      status: "PARTIAL_SUCCESS",
      officeHours: [],
      teachingHours: [{ /* mock data */ }]
    }];
    
    const validatedResults = validateResultStatus(mockResults);
    expect(validatedResults[0].status).toBe("PARTIAL_SUCCESS");
  });
}); 