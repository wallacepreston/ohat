export interface SalesforceContactHourRequest {
  Result_JSON__c: string;
  Contact__c: string;
}

export interface SalesforceContactHourResponse {
  id: string;
  success: boolean;
  errors: any[];
}

export interface ContactHourObject {
  contactId?: string;
  instructor: string;
  email: string | null;
  institution: string;
  course: string;
  days: string[];
  times: string;
  location: string;
  teachingHours: string;
  teachingLocation: string;
  term: string;
  comments?: string | null;
  status: string;
  validatedBy?: string | null;
  officeHourSlots?: TimeSlot[];
  teachingHourSlots?: TimeSlot[];
  source?: string;
}

export interface TimeSlot {
  dayOfWeek: string;
  startHour: string;
  startMinute: string;
  startAmPm: "AM" | "PM";
  endHour: string;
  endMinute: string;
  endAmPm: "AM" | "PM";
  location: string;
  comments?: string;
} 