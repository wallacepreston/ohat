import { NextRequest, NextResponse } from 'next/server';
import { processOfficeHours } from '@/app/actions';
import { PhotoUploadSchema } from '@/types/salesforce';

export const config = {
  api: {
    bodyParser: false, // Disabling the default body parser as we're handling FormData with file uploads
  },
};

export async function POST(req: NextRequest) {
  try {
    console.log('Received photo upload request');
    
    // Parse the FormData from the request
    const formData = await req.formData();
    
    // Validate the request using Zod
    const result = PhotoUploadSchema.safeParse({
      salesforceData: formData.get('salesforceData'),
      photo: formData.get('photo')
    });
    
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
    
    // Process the photo and Salesforce data using our existing action
    const results = await processOfficeHours(formData);
    
    // Return the results
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error processing photo upload:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process photo upload',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 