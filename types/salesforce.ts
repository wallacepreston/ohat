export interface SalesforceData {
  Opportunity: {
    Name: string
    Account: {
      Name: string
      Status: string
      Type: string
      Website: string
      Phone: string
      Address: {
        Street: string
        City: string
        State: string
        PostalCode: string
        Country: string
      }
    }
    Course: {
      Name: string
      SchoolCode: string
      Discipline: string
      Type: string
      Stage: string
      Term: {
        Updated: string
        Start: string
        End: string
      }
    }
    Contacts: Array<{
      Name: string
      Role: string
      Email: string
    }>
  }
}

export interface ProcessedOfficeHours {
  instructor: string
  email: string
  institution: string
  course: string
  days: string[]
  times: string
  location: string
  term: string
  status: "pending" | "validated" | "error"
}

