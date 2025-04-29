import { NextRequest, NextResponse } from 'next/server';
import { unauthorized } from '@/lib/auth';
import { verifyAuth } from '@/lib/auth';
import { SignJWT } from 'jose';
// Use the new route segment config pattern
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = '30Days';

const secret = new TextEncoder().encode(JWT_SECRET);

export async function POST(req: NextRequest) {
  try {
    console.log('received request to generate token');
    
    // Verify authentication using Clerk
    const auth = await verifyAuth(req);
    if (!auth.authorized) {
      return unauthorized(auth.error);
    }
    
    console.log('Generating token for authenticated user:', auth.user);
    
    // Create the payload for the JWT
    const payload = {
      sub: "user-123",
      email: "user@example.com",
      name: "Demo User",
      roles: ['api_user'],
    };
    
    // Sign the JWT token
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(JWT_EXPIRY)
      .sign(secret);
    
    // Return the token
    return NextResponse.json({
      success: true,
      token,
      expiresIn: JWT_EXPIRY,
      userId: payload.sub,
    });
  } catch (error) {
    console.error('Error generating API token:', error);
    return NextResponse.json(
      { error: 'Failed to generate API token', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 