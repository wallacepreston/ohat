import { NextRequest, NextResponse } from 'next/server';
import { readInstructorCrawlMessages } from '@/app/services/sqsService';

/**
 * API route to process SQS messages
 * This will be called by the AWS Lambda function
 */
export async function POST(request: NextRequest) {
  try {
    // Verify the request is coming from our Lambda function
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.LAMBDA_API_KEY;
    
    if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Process the SQS messages
    const result = await readInstructorCrawlMessages();
    
    return NextResponse.json({ 
      success: true,
      message: 'SQS messages processed successfully'
    });
  } catch (error) {
    console.error('Error processing SQS messages:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process SQS messages',
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
} 