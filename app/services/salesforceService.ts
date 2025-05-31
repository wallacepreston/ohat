import { SalesforceContactHourRequest, SalesforceContactHourResponse, ContactHourObject } from "@/app/types/salesforce-contact";
import { OfficeHoursStatus } from "@/types/salesforce"
import { convertToTimeSlots } from "../utils/timeUtils"
import { determineResultStatus } from "@/app/utils/status"

export class SalesforceService {
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private authToken: string;

  constructor() {
    this.baseUrl = process.env.SALESFORCE_API_URL || "https://mh--tst.sandbox.my.salesforce.com/services";
    this.clientId = process.env.SALESFORCE_CLIENT_ID || "";
    this.clientSecret = process.env.SALESFORCE_CLIENT_SECRET || "";
    this.authToken = "";
  }

  public formatContactHourResult(result: ContactHourObject) {
    // Convert to the new time slot format
    const officeHourSlots = convertToTimeSlots(result.days, result.times, result.location, result.comments || undefined);
    const teachingHourSlots = convertToTimeSlots([], result.teachingHours, result.teachingLocation, result.comments || undefined);
    
    // Use determineResultStatus to get the status based on our rules
    const internalStatus = determineResultStatus(result);
    
    // Map OfficeHoursStatus to API status string
    let apiStatus: "SUCCESS" | "PARTIAL_SUCCESS";
    if (internalStatus === OfficeHoursStatus.SUCCESS) {
      apiStatus = "SUCCESS";
    } else {
      apiStatus = "PARTIAL_SUCCESS";
    }
    
    return {
      contactId: result.contactId,
      status: apiStatus,
      officeHours: officeHourSlots,
      teachingHours: teachingHourSlots,
      source: result.validatedBy || "web_search"
    };
  }

  private async getAuthToken(): Promise<string> {
    try {
      const tokenUrl = `${this.baseUrl}/oauth2/token`;
      if (!this.clientId || !this.clientSecret) {
        throw new Error("Salesforce client ID or secret is missing");
      }
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

      // Add scope if needed (even if blank)
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      // params.append('scope', ''); // Uncomment if Salesforce expects a scope field

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`,
          'Accept': '*/*',
          'Cache-Control': 'no-cache'
        },
        body: params.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get Salesforce auth token: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      this.authToken = data.access_token;
      return this.authToken;
    } catch (error) {
      console.error('Error getting Salesforce auth token:', error);
      throw error;
    }
  }

  /**
   * Creates a new Contact Hour record in Salesforce
   * @param contactId The Salesforce Contact ID
   * @param result The contact hour result to store
   * @returns Promise with the created record ID
   */
  async createContactHour(contactId: string, result: any): Promise<string> {
    try {
      // Get fresh auth token before making the request
      await this.getAuthToken();

      const request: SalesforceContactHourRequest = {
        Result_JSON__c: JSON.stringify(result),
        Contact__c: contactId
      };

      const response = await fetch(`${this.baseUrl}/data/v62.0/sobjects/Contact_Hour__c`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create Contact Hour: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data: SalesforceContactHourResponse = await response.json();
      
      if (!data.success) {
        throw new Error(`Failed to create Contact Hour: ${JSON.stringify(data.errors)}`);
      }

      return data.id;
    } catch (error) {
      console.error('Error creating Contact Hour:', error);
      throw error;
    }
  }
}

// Create a singleton instance
export const salesforceService = new SalesforceService(); 