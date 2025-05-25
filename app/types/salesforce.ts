import { OfficeHoursStatus } from "@/types/salesforce-enums"

export interface ProcessedOfficeHours {
  instructor: string;
  email: string | null;
  institution: string;
  course: string;
  days: string[];
  status: OfficeHoursStatus;
  times: string;
  location: string;
  teachingHours: string;
  teachingLocation: string;
  term: string;
  comments?: string;
  validatedBy?: string | null;
  salesforce?: {
    contactHourId: string;
    created: boolean;
    error?: string;
  };
} 