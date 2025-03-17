import { NextRequest, NextResponse } from 'next/server';
import { processOfficeHours } from '@/app/actions';

export async function POST(request: NextRequest) {
  try {
    // Get the raw data from the request body
    const rawRequestData = await request.json();

    const salesforceData = rawRequestData.salesforceData;
    
    // Create a FormData object with the required structure
    const formData = new FormData();

    if (rawRequestData.photo) {
      formData.append('photo', rawRequestData.photo);
    }

    formData.append('salesforceData', JSON.stringify(salesforceData));

    // Process the office hours data
    const results = await processOfficeHours(formData);

    return NextResponse.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error processing office hours:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process office hours',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 