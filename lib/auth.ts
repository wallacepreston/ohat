import * as jwt from 'jsonwebtoken';
import { Secret, SignOptions } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Environment variables for JWT configuration
// These should be set in .env.local and your production environment
const JWT_SECRET = (process.env.JWT_SECRET || 'your-secret-key-change-in-production') as Secret;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
const AUTH_COOKIE_NAME = 'ohat_auth_token';

// User roles
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  API = 'api'
}

// User interface
export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
}

// JWT payload interface
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  name?: string;
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(user: User): string {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name
  };

  const options: SignOptions = { 
    expiresIn: JWT_EXPIRY as jwt.SignOptions['expiresIn']
  };
  return jwt.sign(payload, JWT_SECRET, options);
}

/**
 * Generate an API token (special case for API-only access)
 */
export function generateApiToken(apiKey: string): string {
  const payload: JwtPayload = {
    userId: apiKey,
    email: `api-${apiKey}@ohat.api`,
    role: UserRole.API
  };

  const options: SignOptions = { expiresIn: '365d' };
  return jwt.sign(payload, JWT_SECRET, options);
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Get the current user from the request
 * Checks both Bearer token and cookies
 */
export function getCurrentUser(req: NextRequest): JwtPayload | null {
  // First try to get token from Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return verifyToken(token);
  }

  // If no Authorization header, try cookies
  const cookieStore = cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (token) {
    return verifyToken(token);
  }

  return null;
}

/**
 * Set the auth token as a cookie
 */
export function setAuthCookie(res: NextResponse, token: string): NextResponse {
  // Set the token as an HTTP-only cookie
  res.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 // 24 hours
  });

  return res;
}

/**
 * Clear the auth cookie (used for logout)
 */
export function clearAuthCookie(res: NextResponse): NextResponse {
  res.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  });

  return res;
}

/**
 * Middleware to protect API routes
 * Returns null if authentication is successful, or a NextResponse with error if it fails
 */
export function authMiddleware(
  req: NextRequest,
  requiredRoles: UserRole[] = [UserRole.ADMIN, UserRole.USER, UserRole.API]
): NextResponse | null {
  const user = getCurrentUser(req);

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }

  if (!requiredRoles.includes(user.role)) {
    return NextResponse.json(
      { error: 'Forbidden - Insufficient permissions' },
      { status: 403 }
    );
  }

  // Authentication successful
  return null;
} 