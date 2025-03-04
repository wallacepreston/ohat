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
  status: string
  validatedBy?: string | null
}

