import { NextRequest, NextResponse } from 'next/server';
import { BatchRequest, BatchResponse } from '@/types/salesforce';
import { processBatchOfficeHours } from '@/app/actions';

export async function POST(req: NextRequest) {
  try {
    console.log('Received batch office hours request');
    
    // Parse the request body
    const batchRequest: BatchRequest = await req.json();
    
    // Validate the request
    if (!batchRequest.accountId || !batchRequest.batchId || !batchRequest.institution || !batchRequest.instructors || batchRequest.instructors.length === 0) {
      return NextResponse.json(
        { 
          error: 'Invalid request format. Required fields: accountId, batchId, institution, instructors' 
        },
        { status: 400 }
      );
    }
    
    // Process the batch using our action
    const response = await processBatchOfficeHours(batchRequest);
    
    // Return the response
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error processing batch office hours:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process batch office hours',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 