import { NextRequest, NextResponse } from 'next/server';
import { handleInboundParseWebhook } from '@/app/services/emailProcessingService';
import { queueInstructorCrawl } from '@/app/services/sqsService';
import { OfficeHoursStatus } from '@/types/salesforce';

/**
 * API route handler for receiving SendGrid Inbound Parse webhook
 * 
 * @param req - The incoming request from SendGrid
 * @returns API response
 */
export async function POST(req: NextRequest) {
  try {
    console.log('Received inbound email webhook from SendGrid');
    
    // Check if the request is form data (SendGrid sends multipart/form-data)
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      // Parse form data
      const formData = await req.formData();
      
      // Convert FormData to a regular object for processing
      const payload: Record<string, any> = {};
      for (const [key, value] of formData.entries()) {
        payload[key] = value;
      }

      const envelope = JSON.parse(payload.envelope);
      const from = envelope.from;
      const to = envelope.to;
      
      // Process the email data
      const result = await handleInboundParseWebhook(payload);
      
      console.log('Processed email response:', {
        instructor: result.instructor,
        email: from,
        status: result.status,
        times: result.times,
        location: result.location
      });
      
      // Store the result in a database or queue for further processing
      // (This would be implemented based on our application architecture)
      
      // If office hours weren't found in the email, queue a crawl task
      if (result.status === OfficeHoursStatus.NOT_FOUND && result.email) {
        await queueInstructorCrawl(
          result.email, // Using email as ID
          result.instructor,
          result.email,
          result.institution
        );
        console.log(`Queued crawl for instructor with no office hours found in email: ${result.instructor}`);
      }
      
      return NextResponse.json({
        success: true,
        message: 'Email processed successfully',
        result
      });
    } else if (contentType.includes('application/json')) {
      // Handle JSON payload
      const payload = await req.json();
      
      const result = await handleInboundParseWebhook(payload);
      
      // If office hours weren't found in the email, queue a crawl task
      if (result.status === OfficeHoursStatus.NOT_FOUND && result.email) {
        await queueInstructorCrawl(
          result.email, // Using email as ID
          result.instructor,
          result.email,
          result.institution
        );
        console.log(`Queued crawl for instructor with no office hours found in email: ${result.instructor}`);
      }
      
      return NextResponse.json({
        success: true,
        message: 'Email processed successfully',
        result
      });
    } else {
      console.error('Unsupported content type:', contentType);
      return NextResponse.json(
        { error: 'Unsupported content type. Expected multipart/form-data or application/json' },
        { status: 415 }
      );
    }
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