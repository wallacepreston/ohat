import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getApiDocs } from '@/lib/swagger';

// Use the new route segment config pattern
export const dynamic = 'force-dynamic'; // Always generate the latest docs
export const runtime = 'nodejs';

/**
 * GET handler for the Swagger specification as JSON
 */
export function GET() {
  try {
    // Try to get the API docs
    const spec = getApiDocs();
    return NextResponse.json(spec);
  } catch (error) {
    console.error('Error serving API docs:', error);
    
    // Return a basic error response
    return NextResponse.json(
      {
        error: 'Failed to load API documentation',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
} 