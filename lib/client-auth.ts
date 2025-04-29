import { useAuth } from "@clerk/nextjs";

/**
 * Get the Authorization header with the user's Clerk JWT token
 * This should be used in client components to make authenticated API requests
 */
export function useAuthHeader() {
  const { getToken } = useAuth();
  
  /**
   * Returns the headers object with Authorization header
   */
  const getAuthHeader = async (): Promise<HeadersInit> => {
    const token = await getToken();
    
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };
  
  return { getAuthHeader };
}

/**
 * Utility function to make authenticated API requests
 * This should be used in client components
 */
export function useAuthenticatedFetch() {
  const { getAuthHeader } = useAuthHeader();
  
  const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = await getAuthHeader();
    
    return fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });
  };
  
  return { authFetch };
} 