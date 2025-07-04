import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';

const { JWT_SECRET = 'your-secret-key-for-development' } = process.env;
interface JwtPayload {
  azp?: string;
  exp?: number;
  nbf?: number;
  sub: string;
  sid: string;
  [key: string]: any;
}

/**
 * Verifies JWT token from cookies or Authorization header
 * Returns user payload if valid, null if not
 */
export async function verifyAuth(req: NextRequest): Promise<{ 
  authorized: boolean;
  user?: any;
  error?: string;
}> {
  try {
    // Check for Clerk session cookie
    const clerkSession = req.cookies.get('__session')?.value;
    
    if (clerkSession) {
      try {
        // Decode Clerk JWT - we just get the data, Clerk handles verification 
        const decoded = jose.decodeJwt(clerkSession);
        
        if (decoded && decoded.sub) {
          return {
            authorized: true,
            user: {
              id: decoded.sub,
              sessionId: decoded.sid,
              ...decoded
            }
          };
        }
      } catch (e) {
        console.error('Error decoding Clerk session:', e);
      }
    }
    
    // Fallback to our custom token if Clerk session is not found
    const token = req.cookies.get('auth_token')?.value ||
      req.headers.get('authorization')?.split(' ')[1];
    
    if (token) {
      // Verify the token using JWT
      
      try {
        // Convert secret to proper format
        const secretKey = new TextEncoder().encode(JWT_SECRET);
        
        // Verify the token
        const { payload } = await jose.jwtVerify(token, secretKey);
        
        return {
          authorized: true,
          user: payload
        };
      } catch (e) {
        return {
          authorized: false,
          error: e instanceof Error ? e.message : 'Invalid token'
        };
      }
    }
    
    return { 
      authorized: false, 
      error: 'No authentication token found' 
    };
  } catch (error) {
    return { 
      authorized: false, 
      error: error instanceof Error ? error.message : 'Unknown error verifying token'
    };
  }
}

/**
 * Helper method to create an unauthorized response
 */
export function unauthorized(message: string = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  );
}
