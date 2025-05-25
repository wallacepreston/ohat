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
  contactId: string;
  status: string;
  source: string;
  officeHours: TimeSlot[];
  teachingHours: TimeSlot[];
}

export interface TimeSlot {
  dayOfWeek: string;
  startHour: string;
  startMinute: string;
  startAmPm: string;
  endHour: string;
  endMinute: string;
  endAmPm: string;
  location: string;
  comments: string;
} 