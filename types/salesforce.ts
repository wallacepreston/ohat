export interface SalesforceData {
  contactAccountName: string
  contactLastName: string
  contactFirstName: string
  contactDepartmentName: string
  type: string
  dayOfWeek: string
  startHour: number
  startMinute: number
  startAMPM: string
  endHour: number
  endMinute: number
  endAMPM: string
  location: string
  contactOfficeLocation: string
  lastModifiedDate: string
  comments: string
  noHoursPosted: number
  teachesExclusivelyOnline: number
}

export enum OfficeHoursStatus {
  VALIDATED = 'VALIDATED',
  FOUND = 'FOUND',
  PARTIAL_INFO_FOUND = 'PARTIAL_INFO_FOUND',
  NOT_FOUND = 'NOT_FOUND',
  ERROR = 'ERROR'
}

export interface ProcessedOfficeHours {
  instructor: string
  email: string
  institution: string
  course: string
  days: string[]
  times: string
  location: string
  teachingHours: string
  teachingLocation: string
  term: string
  status: OfficeHoursStatus
  validatedBy?: string | null
}

export function formatStatus(status: OfficeHoursStatus): string {
  return status
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

