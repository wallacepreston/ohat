import { NextRequest, NextResponse } from 'next/server';
import { BatchRequest, BatchResponse, BatchRequestSchema } from '@/types/salesforce';
import { processBatchOfficeHours } from '@/app/actions';

export async function POST(req: NextRequest) {
  try {
    console.log('Received batch office hours request');
    
    // Parse the request body
    const rawData = await req.json();
    
    // Validate the request using Zod
    const result = BatchRequestSchema.safeParse(rawData);
    
    if (!result.success) {
      // Return validation errors
      return NextResponse.json(
        { 
          error: 'Invalid request format',
          details: result.error.format()
        },
        { status: 400 }
      );
    }
    
    // Request is valid, use the parsed data
    const batchRequest: BatchRequest = result.data;
    
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