import { SalesforceContactHourRequest, SalesforceContactHourResponse, ContactHourObject } from "@/app/types/salesforce-contact";

export class SalesforceService {
  private readonly baseUrl: string;
  private readonly authToken: string;

  constructor() {
    this.baseUrl = process.env.SALESFORCE_API_URL || "https://mh--tst.sandbox.my.salesforce.com/services/data/v62.0";
    this.authToken = process.env.SALESFORCE_AUTH_TOKEN || "";
  }

  /**
   * Creates a new Contact Hour record in Salesforce
   * @param contactId The Salesforce Contact ID
   * @param result The contact hour result to store
   * @returns Promise with the created record ID
   */
  async createContactHour(contactId: string, result: ContactHourObject): Promise<string> {
    try {
      const request: SalesforceContactHourRequest = {
        Result_JSON__c: JSON.stringify(result),
        Contact__c: contactId
      };

      const response = await fetch(`${this.baseUrl}/sobjects/Contact_Hour__c`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Salesforce API error: ${response.status} ${response.statusText}`);
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