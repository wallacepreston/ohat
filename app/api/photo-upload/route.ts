import { NextRequest, NextResponse } from 'next/server';
import { processOfficeHours } from '@/app/actions';
import { PhotoUploadSchema } from '@/types/salesforce';
import { verifyAuth, unauthorized } from '@/lib/auth';

// Use the new route segment config pattern with export const runtime and export const dynamic
export const dynamic = 'force-dynamic'; // Make sure the route is not statically optimized
export const runtime = 'nodejs'; // Use Node.js runtime (default, but explicit here)

/**
 * @swagger
 * /api/photo-upload:
 *   post:
 *     summary: Process office hours from a photo
 *     description: >
 *       Uploads a photo containing office hours information (like a syllabus, 
 *       office door, or website) along with instructor data for analysis. 
 *       The API extracts office hours information from the image.
 *     tags:
 *       - Office Hours
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - salesforceData
 *               - photo
 *             properties:
 *               salesforceData:
 *                 type: string
 *                 format: json
 *                 description: JSON string containing instructor and institution data
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: Photo file containing office hours information
 *     responses:
 *       '200':
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ProcessedOfficeHours'
 *       '400':
 *         description: Bad request - missing required files or data
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
 *     ProcessedOfficeHours:
 *       type: object
 *       required:
 *         - instructor
 *         - email
 *         - institution
 *         - course
 *         - days
 *         - times
 *         - location
 *         - teachingHours
 *         - teachingLocation
 *         - term
 *         - status
 *       properties:
 *         instructor:
 *           type: string
 *           description: Instructor's name
 *         email:
 *           type: string
 *           description: Instructor's email address
 *         institution:
 *           type: string
 *           description: Institution name
 *         course:
 *           type: string
 *           description: Course information
 *         days:
 *           type: array
 *           items:
 *             type: string
 *           description: Days of the week for office hours
 *         times:
 *           type: string
 *           description: Formatted office hours time string
 *         location:
 *           type: string
 *           description: Office hours location
 *         teachingHours:
 *           type: string
 *           description: Formatted teaching hours time string
 *         teachingLocation:
 *           type: string
 *           description: Teaching location
 *         term:
 *           type: string
 *           description: Academic term
 *         status:
 *           type: string
 *           enum: [VALIDATED, FOUND, PARTIAL_INFO_FOUND, NOT_FOUND, ERROR]
 *           description: Status of the office hours search
 *         validatedBy:
 *           type: string
 *           nullable: true
 *           description: Who validated the office hours data
 */
export async function POST(req: NextRequest) {
  try {
    console.log('Received photo upload request');
    
    // Verify authentication using Clerk
    const auth = await verifyAuth(req);
    if (!auth.authorized) {
      return unauthorized(auth.error);
    }
    
    console.log('Authenticated user:', auth.user);
    
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