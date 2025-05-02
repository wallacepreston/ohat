import { z } from 'zod';

// Enums
export enum OfficeHoursStatus {
  VALIDATED = 'VALIDATED',
  FOUND = 'FOUND',
  PARTIAL_INFO_FOUND = 'PARTIAL_INFO_FOUND',
  NOT_FOUND = 'NOT_FOUND',
  ERROR = 'ERROR'
}

// Helper functions
export function formatStatus(status: OfficeHoursStatus): string {
  return status
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Zod Schemas

// TimeSlot schema
export const TimeSlotSchema = z.object({
  startHour: z.string(),
  startMinute: z.string(),
  startAmPm: z.enum(["AM", "PM"]),
  endHour: z.string(),
  endMinute: z.string(),
  endAmPm: z.enum(["AM", "PM"]),
  dayOfWeek: z.string(), // Can include multiple days separated by pipe (e.g., "Monday|Wednesday|Friday")
  comments: z.string().optional(),
  location: z.string()
});

// BatchRequestInstructor schema
export const BatchRequestInstructorSchema = z.object({
  contactId: z.string(),
  name: z.string(),
  email: z.string().email().or(z.literal("")),
  department: z.string().optional().nullable(),
  isKeyDecisionMaker: z.boolean().optional().nullable()
});

// BatchRequest schema
export const BatchRequestSchema = z.object({
  accountId: z.string(),
  batchId: z.string().optional(),
  institution: z.string(),
  instructors: z.array(BatchRequestInstructorSchema).nonempty()
});

// BatchResponseResult schema
export const BatchResponseResultSchema = z.object({
  contactId: z.string(),
  status: z.enum(["SUCCESS", "PARTIAL_SUCCESS"]),
  officeHours: z.array(TimeSlotSchema),
  teachingHours: z.array(TimeSlotSchema),
  source: z.string()
});

// BatchResponseException schema
export const BatchResponseExceptionSchema = z.object({
  contactId: z.string(),
  status: z.enum(["NOT_FOUND", "ERROR"]),
  reason: z.string(),
  actionTaken: z.enum(["NONE", "EMAIL_SENT", "CRAWL_QUEUED"])
});

// BatchResponse schema
export const BatchResponseSchema = z.object({
  batchId: z.string(),
  processedTimestamp: z.string(),
  results: z.array(BatchResponseResultSchema),
  exceptions: z.array(BatchResponseExceptionSchema)
});

// ProcessedOfficeHours schema
export const ProcessedOfficeHoursSchema = z.object({
  instructor: z.string(),
  email: z.string(),
  institution: z.string(),
  course: z.string(),
  days: z.array(z.string()),
  times: z.string(),
  location: z.string(),
  teachingHours: z.string(),
  teachingLocation: z.string(),
  term: z.string(),
  comments: z.string().nullable().optional(),
  status: z.nativeEnum(OfficeHoursStatus),
  validatedBy: z.string().nullable().optional()
});

// SalesforceData schema
export const SalesforceDataSchema = z.object({
  Account_ID__c: z.string().optional(),
  Account_Name__c: z.string().optional(),
  Additional_Notes__c: z.string().optional(),
  Authorship_Interest__c: z.array(z.string()).optional(),
  Authorship_Interest_Subtopic__c: z.array(z.string()).optional(),
  Buy_Criteria__c: z.string().optional(),
  Consent_to_Communicate_SFDC__c: z.boolean().optional(),
  Contact_Email__c: z.string().optional(),
  Contact_Folding_Priority__c: z.number().optional(),
  Contact_Name__c: z.string().optional(),
  Contact_Status__c: z.string().optional(),
  CreatedById: z.string().optional(),
  CreatedLastModified__c: z.boolean().optional(),
  Creation_Source_ID__c: z.string().optional(),
  CS_Identification__c: z.string().optional(),
  CS_Partner__c: z.string().optional(),
  CS_Partner_Engagement__c: z.string().optional(),
  CurrencyIsoCode: z.string().optional(),
  Date_of_last_Demo__c: z.string().optional(),
  Decision_Maker_Type__c: z.string().optional(),
  Deleted__c: z.boolean().optional(),
  Digital_Training_Temp_Created__c: z.boolean().optional(),
  Division: z.string().optional(),
  First_Time_Instructor__c: z.boolean().optional(),
  Handoff_Type__c: z.string().optional(),
  Have_they_had_a_demo__c: z.string().optional(),
  Implied_Consent_Expiration_Date__c: z.string().optional(),
  Implied_Consent_Obtained_Date__c: z.string().optional(),
  Individual_Motive__c: z.string().optional(),
  Instructor_Type__c: z.string().optional(),
  INTLId__c: z.string().optional(),
  Is_INTL_Record__c: z.boolean().optional(),
  Is_Teaching__c: z.boolean().optional(),
  Last_Activity_Date__c: z.string().optional(),
  LastModifiedById: z.string().optional(),
  Last_Visit__c: z.string().optional(),
  Lead__c: z.boolean().optional(),
  Lead_Submitted_On__c: z.string().optional(),
  LegacyId__c: z.string().optional(),
  Loyalty__c: z.string().optional(),
  Office_Hours__c: z.string().optional(),
  Contact_Office_Phone__c: z.string().optional(),
  Opp_Year__c: z.number().optional(),
  Opportunity__c: z.string().optional(),
  Opportunity_Close_Date__c: z.string().optional(),
  Opportunity_Contact_Name: z.string().optional(),
  Other_Interests__c: z.array(z.string()).optional(),
  Potential_Vote__c: z.boolean().optional(),
  Preferred_Sample_Format__c: z.string().optional(),
  Price_Class__c: z.string().optional(),
  Primary__c: z.boolean().optional(),
  Primary_Interest__c: z.string().optional(),
  R2_Record__c: z.boolean().optional(),
  Rank__c: z.string().optional(),
  Review_Interest__c: z.array(z.string()).optional(),
  Review_Interest_Subtopic__c: z.array(z.string()).optional(),
  Risk_vs_Reward__c: z.string().optional(),
  Role__c: z.string().optional(),
  School_Course_Code__c: z.string().optional(),
  School_Course_Name__c: z.string().optional(),
  Sort__c: z.string().optional(),
  Sort_Keyword__c: z.string().optional(),
  Source__c: z.string().optional(),
  Stage__c: z.string().optional(),
  Strategy_Worksheet__c: z.boolean().optional(),
  Subscription_Opp_Contact_Email__c: z.string().optional(),
  Synced_with_SEP__c: z.boolean().optional(),
  Term_Tot_Enr__c: z.string().optional(),
  Term_Tot_Rev__c: z.string().optional(),
  Title__c: z.string().optional(),
  Total_Enrollment__c: z.number().optional(),
  Voting__c: z.string().optional(),
  Opportunity_Year_Term__c: z.string().optional()
});

// Form submission schema for photo uploads
export const PhotoUploadSchema = z.object({
  salesforceData: z.string().refine((data) => {
    try {
      const parsed = JSON.parse(data);
      return BatchRequestSchema.safeParse(parsed).success;
    } catch {
      return false;
    }
  }, {
    message: "Invalid JSON data. Must contain valid BatchRequest data."
  }),
  photo: z.instanceof(File, { 
    message: "Photo must be a valid file" 
  })
});

// Infer TypeScript types from Zod schemas
export type TimeSlot = z.infer<typeof TimeSlotSchema>;
export type BatchRequestInstructor = z.infer<typeof BatchRequestInstructorSchema>;
export type BatchRequest = z.infer<typeof BatchRequestSchema>;
export type BatchResponseResult = z.infer<typeof BatchResponseResultSchema>;
export type BatchResponseException = z.infer<typeof BatchResponseExceptionSchema>;
export type BatchResponse = z.infer<typeof BatchResponseSchema>;
export type ProcessedOfficeHours = z.infer<typeof ProcessedOfficeHoursSchema>;
export type SalesforceData = z.infer<typeof SalesforceDataSchema>;
export type PhotoUpload = z.infer<typeof PhotoUploadSchema>;
