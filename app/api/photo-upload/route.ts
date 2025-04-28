import { NextRequest, NextResponse } from 'next/server';
import { processOfficeHours } from '@/app/actions';

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
    const salesforceData = formData.get('salesforceData');
    const photo = formData.get('photo');
    
    // Validate the request
    if (!salesforceData) {
      return NextResponse.json(
        { error: 'Missing required salesforceData field' },
        { status: 400 }
      );
    }
    
    if (!photo || !(photo instanceof File)) {
      return NextResponse.json(
        { error: 'Missing or invalid photo file' },
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