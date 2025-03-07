export interface SalesforceData {
  accountId?: string;
  accountName?: string;
  additionalNotes?: string;
  authorshipInterest?: string[];
  authorshipInterestSubtopic?: string[];
  buyCriteria?: string;
  consentToCommunicateSFDC?: boolean;
  contactEmail?: string;
  contactFoldingPriority?: number;
  contactName?: string;
  contactStatus?: string;
  createdById?: string;
  createdLastModified?: boolean;
  creationSourceId?: string;
  csIdentification?: string;
  csPartner?: string;
  csPartnerEngagement?: string;
  currency?: string;
  dateOfLastDemo?: string;
  decisionMakerType?: string;
  deleted?: boolean;
  digitalTrainingTempCreated?: boolean;
  division?: string;
  firstTimeInstructor?: boolean;
  handoffType?: string;
  hadDemo?: string;
  impliedConsentExpirationDate?: string;
  impliedConsentObtainedDate?: string;
  individualMotive?: string;
  instructorType?: string;
  intlId?: string;
  isIntlRecord?: boolean;
  isTeaching?: boolean;
  lastActivityDate?: string;
  lastModifiedById?: string;
  lastVisit?: string;
  leadNominated?: boolean;
  leadSubmittedOn?: string;
  legacyId?: string;
  loyalty?: string;
  officeHours?: string;
  officePhone?: string;
  opportunityId?: string;
  opportunityCloseDate?: string;
  opportunityContactName?: string;
  otherInterests?: string[];
  potentialVote?: boolean;
  preferredSampleFormat?: string;
  priceClass?: string;
  primary?: boolean;
  primaryInterest?: string;
  r2Record?: boolean;
  rank?: string;
  reviewInterest?: string[];
  reviewInterestSubtopic?: string[];
  riskVsReward?: string;
  role?: string;
  schoolCourseCode?: string;
  schoolCourseName?: string;
  sort?: string;
  sortKeyword?: string;
  source?: string;
  stage?: string;
  strategyWorksheet?: boolean;
  subscriptionOppContactEmail?: string;
  syncedWithSEP?: boolean;
  termTotEnr?: string;
  termTotRev?: string;
  title?: string;
  totalEnrollment?: string;
  voting?: string;
  yearTerm?: string;
}

export enum OfficeHoursStatus {
  VALIDATED = 'VALIDATED',
  FOUND = 'FOUND',
  PARTIAL_INFO_FOUND = 'PARTIAL_INFO_FOUND',
  NOT_FOUND = 'NOT_FOUND',
  ERROR = 'ERROR'
}

export interface ProcessedOfficeHours {
  instructor: string;
  email: string;
  institution: string;
  course: string;
  days: string[];
  times: string;
  location: string;
  teachingHours: string;
  teachingLocation: string;
  term: string;
  status: OfficeHoursStatus;
  validatedBy?: string | null;
}

export function formatStatus(status: OfficeHoursStatus): string {
  return status
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
