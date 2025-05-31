import { NextRequest, NextResponse } from 'next/server';
import { readInstructorCrawlMessages } from '@/app/services/sqsService';

// Use the new route segment config pattern
export const dynamic = 'force-dynamic'; // Route should not be cached
export const runtime = 'nodejs'; // Use Node.js runtime

/**
 * @swagger
 * /api/process-sqs:
 *   post:
 *     summary: Process SQS messages for instructor crawls
 *     description: >
 *       Processes SQS messages containing instructor information to crawl
 *       for office hours data. This endpoint is typically called by an AWS Lambda
 *       function and requires API key authorization.
 *     tags:
 *       - SQS
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       '200':
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'SQS messages processed successfully'
 *       '401':
 *         description: Unauthorized - Invalid or missing API key
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 'Unauthorized'
 *       '500':
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                 details:
 *                   type: string
 */
export async function POST(request: NextRequest) {
  try {
    // Check for API key in Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    const apiKey = authHeader.split(' ')[1];
    const expectedApiKey = process.env.LAMBDA_API_KEY;

    if (!expectedApiKey) {
      console.error('LAMBDA_API_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (apiKey !== expectedApiKey) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid API key' },
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