import { NextRequest, NextResponse } from 'next/server';
import { handleInboundParseWebhook } from '@/app/services/emailProcessingService';
import { queueInstructorCrawl } from '@/app/services/sqsService';
import { emitOfficeHoursUpdate } from '@/app/lib/socket';
import { OfficeHoursStatus, ProcessedOfficeHours } from '@/types/salesforce';
import { salesforceService } from '@/app/services/salesforceService';

const dev = process.env.NODE_ENV !== 'production';

/**
 * API route handler for receiving SendGrid Inbound Parse webhook
 * 
 * @param req - The incoming request from SendGrid
 * @returns API response
 */
export async function POST(req: NextRequest) {
  try {
    console.log('Received inbound email webhook from SendGrid');
    
    // Parse the request payload based on content type
    let payload: Record<string, any>;
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      // Parse form data from SendGrid
      const formData = await req.formData();
      
      // Convert FormData to a regular object
      payload = {};
      for (const [key, value] of formData.entries()) {
        payload[key] = value;
      }
      
      // Parse envelope if present
      if (payload.envelope && typeof payload.envelope === 'string') {
        try {
          payload.parsedEnvelope = JSON.parse(payload.envelope);
        } catch (e) {
          console.warn('Failed to parse envelope JSON:', e);
        }
      }
    } else if (contentType.includes('application/json')) {
      // Parse JSON payload
      payload = await req.json();
    } else {
      console.error('Unsupported content type:', contentType);
      return NextResponse.json(
        { error: 'Unsupported content type. Expected multipart/form-data or application/json' },
        { status: 415 }
      );
    }
    
    // Common processing logic for both payload types
    const result = await handleInboundParseWebhook(payload);
    
    console.log('Processed email response:', result);

    // TODO - Make API call to SFDC
    if (dev) {
      // Emit Socket.IO event with the processed data
      emitOfficeHoursUpdate(result);
    } else {
      console.log('TODO: send instructor office hours to SFDC. Skipping Socket.IO event in production.');
      const { contactId } = result;

      const formattedResult = salesforceService.formatContactHourResult({
        ...result,
        contactId: contactId,
        status: result.status
      });
      const contactHourId = await salesforceService.createContactHour(contactId, formattedResult);      console.log(`Created Contact Hour record for Contact ID: ${result.contactId}. Contact Hour ID: ${contactHourId}`);
    }
    
    // Handle "not found" status
    if (result.status === OfficeHoursStatus.NOT_FOUND && result.email) {
      console.log(`No office hours found in email for instructor: ${result.instructor}`);
    }
    
    // Return the processed result
    return NextResponse.json({
      success: true,
      message: 'Email processed successfully',
      result
    });
  } catch (error) {
    console.error('Error processing inbound email:', error);
    return NextResponse.json(
      { error: 'Failed to process inbound email', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * Optional GET handler for testing/verification
 */
export async function GET() {
  return NextResponse.json({ message: 'SendGrid Inbound Parse webhook endpoint is active' });
} 