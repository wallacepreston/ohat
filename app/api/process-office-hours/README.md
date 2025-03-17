# **Overview**

The process-office-hours API endpoint provides external access to the office hours processing functionality. It accepts JSON data and returns processed office hours information.

## **Endpoint**

```sh
POST /api/process-office-hours
```

## **Request Format**

```typescript
{
  salesforceData: [
    {
      // ... your data fields
    }
  ],
  photo: File
}
```

`salesforceData` is an array of objects with the following properties:

```typescript
export interface SalesforceData {
  Account_ID__c?: string;
  Account_Name__c?: string;
  Additional_Notes__c?: string;
  Authorship_Interest__c?: string[];
  Authorship_Interest_Subtopic__c?: string[];
  Buy_Criteria__c?: string;
  Consent_to_Communicate_SFDC__c?: boolean;
  Contact_Email__c?: string;
  Contact_Folding_Priority__c?: number;
  Contact_Name__c?: string;
  Contact_Status__c?: string;
  CreatedById?: string;
  CreatedLastModified__c?: boolean;
  Creation_Source_ID__c?: string;
  CS_Identification__c?: string;
  CS_Partner__c?: string;
  CS_Partner_Engagement__c?: string;
  CurrencyIsoCode?: string;
  Date_of_last_Demo__c?: string;
  Decision_Maker_Type__c?: string;
  Deleted__c?: boolean;
  Digital_Training_Temp_Created__c?: boolean;
  Division?: string;
  First_Time_Instructor__c?: boolean;
  Handoff_Type__c?: string;
  Have_they_had_a_demo__c?: string;
  Implied_Consent_Expiration_Date__c?: string;
  Implied_Consent_Obtained_Date__c?: string;
  Individual_Motive__c?: string;
  Instructor_Type__c?: string;
  INTLId__c?: string;
  Is_INTL_Record__c?: boolean;
  Is_Teaching__c?: boolean;
  Last_Activity_Date__c?: string;
  LastModifiedById?: string;
  Last_Visit__c?: string;
  Lead__c?: boolean;
  Lead_Submitted_On__c?: string;
  LegacyId__c?: string;
  Loyalty__c?: string;
  Office_Hours__c?: string;
  Contact_Office_Phone__c?: string;
  Opp_Year__c?: number;
  Opportunity__c?: string;
  Opportunity_Close_Date__c?: string;
  Opportunity_Contact_Name?: string;
  Other_Interests__c?: string[];
  Potential_Vote__c?: boolean;
  Preferred_Sample_Format__c?: string;
  Price_Class__c?: string;
  Primary__c?: boolean;
  Primary_Interest__c?: string;
  R2_Record__c?: boolean;
  Rank__c?: string;
  Review_Interest__c?: string[];
  Review_Interest_Subtopic__c?: string[];
  Risk_vs_Reward__c?: string;
  Role__c?: string;
  School_Course_Code__c?: string;
  School_Course_Name__c?: string;
  Sort__c?: string;
  Sort_Keyword__c?: string;
  Source__c?: string;
  Stage__c?: string;
  Strategy_Worksheet__c?: boolean;
  Subscription_Opp_Contact_Email__c?: string;
  Synced_with_SEP__c?: boolean;
  Term_Tot_Enr__c?: string;
  Term_Tot_Rev__c?: string;
  Title__c?: string;
  Total_Enrollment__c?: number;
  Voting__c?: string;
  Opportunity_Year_Term__c?: string;
}
```

## **Photo Upload**

The API endpoint is the same for photo and search based on JSON.  If sending a photo, it should be accompanied by the name of the instructor and the institution:

```typescript
{
  salesforceData: {
    Contact_Name__c: "Sophia Vaksman",
    Account_Name__c: "RUTGERS UNIVERSITY NEW BRUNSWICK"
  },
  photo: File
}
```

## **Response Format**

### Success Response (200 OK)

```typescript
{
  success: true;
  data: ProcessedOfficeHours[];
}
```

`data` is an array of objects with the following properties:

```typescript
type ProcessedOfficeHours {
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

type OfficeHoursStatus = {
  VALIDATED = 'VALIDATED',
  FOUND = 'FOUND',
  PARTIAL_INFO_FOUND = 'PARTIAL_INFO_FOUND',
  NOT_FOUND = 'NOT_FOUND',
  ERROR = 'ERROR'
} 
```

### Error Response (500 Internal Server Error)

```typescript
{
  success: false;
  error: string;
  details: string;
}
```

## **Example Usage**

```typescript
// Example request
const response = await fetch('/api/process-office-hours', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    salesforceData: [
      {
        "Account_Name__c": "RUTGERS UNIVERSITY NEW BRUNSWICK",
        "Contact_Name__c": "Sophia Vaksman",
        "School_Course_Name__c": "MATHEMATICS",
        "Last_Activity_Date__c": "10/18/24",
        "Additional_Notes__c": "Lecturer",
        "Contact_Email__c": "svaksman@rutgers.edu"
      },
      {
        "Account_Name__c": "RUTGERS UNIVERSITY NEW BRUNSWICK",
        "Contact_Name__c": "Tsipenyuk Natalya",
        "School_Course_Name__c": "MATHEMATICS",
        "Last_Activity_Date__c": "10/18/24",
        "Additional_Notes__c": "Lecturer",
        "Contact_Email__c": "natalya.tsipenyuk@rutgers.edu"
      }
    ]
  })
});

const result = await response.json();
```

```curl
curl -X POST \
  http://localhost:3000/api/process-office-hours \
  -H 'Content-Type: application/json' \
  -d '{"salesforceData": [{"Account_Name__c": "RUTGERS UNIVERSITY NEW BRUNSWICK", "Contact_Name__c": "Sophia Vaksman", "School_Course_Name__c": "MATHEMATICS", "Last_Activity_Date__c": "10/18/24", "Additional_Notes__c": "Lecturer", "Contact_Email__c": "svaksman@rutgers.edu"}]}'
```

## **Status Codes**

- `200`: Successfully processed office hours data
- `500`: Internal server error during processing

## **Error Handling**

The endpoint handles various error scenarios:

- Invalid JSON data
- Missing required fields
- Processing errors
- Server errors

All errors are logged and appropriate error responses are returned to the client.
