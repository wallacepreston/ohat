import { NextRequest, NextResponse } from 'next/server';
import { BatchRequest, BatchResponse, BatchRequestSchema } from '@/types/salesforce';
import { processBatchOfficeHours } from '@/app/actions';

// Use the new route segment config pattern
export const dynamic = 'force-dynamic'; // Make sure the route is not statically optimized
export const runtime = 'nodejs'; // Use Node.js runtime (default, but explicit here)

/**
 * @swagger
 * /api/batch-office-hours:
 *   post:
 *     summary: Process a batch of instructors' office hours data
 *     description: Searches for office hours information for a batch of instructors.
 *     tags:
 *       - Office Hours
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accountId
 *               - batchId
 *               - institution
 *               - instructors
 *             properties:
 *               accountId:
 *                 type: string
 *                 description: Account identifier
 *               batchId:
 *                 type: string
 *                 description: Unique identifier for this batch request
 *               institution:
 *                 type: string
 *                 description: Name of the institution
 *               instructors:
 *                 type: array
 *                 description: List of instructors to search for
 *                 items:
 *                   type: object
 *                   required:
 *                     - contactId
 *                     - name
 *                     - email
 *                     - department
 *                   properties:
 *                     contactId:
 *                       type: string
 *                       description: Unique identifier for the instructor
 *                     name:
 *                       type: string
 *                       description: Instructor's name
 *                     email:
 *                       type: string
 *                       description: Instructor's email address
 *                     department:
 *                       type: string
 *                       description: Instructor's department
 *                     isKeyDecisionMaker:
 *                       type: boolean
 *                       description: Whether the instructor is a key decision maker
 *     responses:
 *       '200':
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - batchId
 *                 - processedTimestamp
 *                 - results
 *                 - exceptions
 *               properties:
 *                 batchId:
 *                   type: string
 *                   description: Batch identifier matching the request
 *                 processedTimestamp:
 *                   type: string
 *                   format: date-time
 *                   description: When the batch was processed
 *                 results:
 *                   type: array
 *                   description: Successfully processed instructor results
 *                   items:
 *                     $ref: '#/components/schemas/BatchResponseResult'
 *                 exceptions:
 *                   type: array
 *                   description: Any errors that occurred while processing instructors
 *                   items:
 *                     $ref: '#/components/schemas/BatchResponseException'
 *       '400':
 *         description: Bad request - missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 details:
 *                   type: object
 *       '500':
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 details:
 *                   type: string
 * components:
 *   schemas:
 *     BatchResponseResult:
 *       type: object
 *       required:
 *         - contactId
 *         - status
 *         - officeHours
 *         - teachingHours
 *         - source
 *       properties:
 *         contactId:
 *           type: string
 *           description: Identifier matching the submitted instructor
 *         status:
 *           type: string
 *           enum: [SUCCESS, PARTIAL_SUCCESS]
 *           description: Status of the office hours search
 *         officeHours:
 *           type: array
 *           description: Office hours found for the instructor
 *           items:
 *             $ref: '#/components/schemas/TimeSlot'
 *         teachingHours:
 *           type: array
 *           description: Teaching hours found for the instructor
 *           items:
 *             $ref: '#/components/schemas/TimeSlot'
 *         source:
 *           type: string
 *           description: Source of the office hours information
 *     BatchResponseException:
 *       type: object
 *       required:
 *         - contactId
 *         - status
 *         - reason
 *         - actionTaken
 *       properties:
 *         contactId:
 *           type: string
 *           description: Identifier matching the submitted instructor
 *         status:
 *           type: string
 *           enum: [NOT_FOUND, ERROR]
 *           description: Type of exception that occurred
 *         reason:
 *           type: string
 *           description: Error message or reason for the exception
 *         actionTaken:
 *           type: string
 *           enum: [NONE, EMAIL_SENT, CRAWL_QUEUED]
 *           description: Action taken in response to the exception
 *     TimeSlot:
 *       type: object
 *       required:
 *         - startHour
 *         - startMinute
 *         - startAmPm
 *         - endHour
 *         - endMinute
 *         - endAmPm
 *         - dayOfWeek
 *         - location
 *       properties:
 *         startHour:
 *           type: string
 *           description: Start hour
 *         startMinute:
 *           type: string
 *           description: Start minute
 *         startAmPm:
 *           type: string
 *           enum: [AM, PM]
 *           description: AM/PM for start time
 *         endHour:
 *           type: string
 *           description: End hour
 *         endMinute:
 *           type: string
 *           description: End minute
 *         endAmPm:
 *           type: string
 *           enum: [AM, PM]
 *           description: AM/PM for end time
 *         dayOfWeek:
 *           type: string
 *           description: Day(s) of the week, multiple days can be separated by '|'
 *         comments:
 *           type: string
 *           description: Optional comments about this time slot
 *         location:
 *           type: string
 *           description: Location for this time slot
 */
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