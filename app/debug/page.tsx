"use client";

import { useEffect, useState } from "react";

export default function DebugPage() {
  const [debug, setDebug] = useState<{
    clerkPublishableKey: string | null;
    clerkEnvOk: boolean;
    isServer: boolean;
  }>({
    clerkPublishableKey: null,
    clerkEnvOk: false,
    isServer: true
  });

  useEffect(() => {
    // Check for Clerk environment variables
    const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || null;
    
    setDebug({
      clerkPublishableKey: clerkPublishableKey ? 
        `${clerkPublishableKey.substring(0, 8)}...` : null,
      clerkEnvOk: !!clerkPublishableKey,
      isServer: false
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">Clerk Configuration Debug</h1>
        
        <div className="bg-white shadow-md rounded p-6 mb-4">
          <h2 className="text-lg font-medium mb-4">Environment Variables</h2>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</p>
              {debug.isServer ? (
                <p className="text-yellow-600">Checking...</p>
              ) : (
                <div className="flex items-center mt-1">
                  {debug.clerkPublishableKey ? (
                    <>
                      <span className="text-green-600 mr-2">✓</span>
                      <span className="text-sm text-gray-600">{debug.clerkPublishableKey}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-red-600 mr-2">✗</span>
                      <span className="text-sm text-red-600">Not found</span>
                    </>
                  )}
                </div>
              )}
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-700">CLERK_SECRET_KEY</p>
              <p className="text-sm text-gray-500">
                (Can only be checked on the server)
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white shadow-md rounded p-6">
          <h2 className="text-lg font-medium mb-4">Configuration Status</h2>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-700">Clerk Environment Variables</span>
              {debug.isServer ? (
                <span className="text-yellow-600">Checking...</span>
              ) : (
                <span className={debug.clerkEnvOk ? "text-green-600" : "text-red-600"}>
                  {debug.clerkEnvOk ? "OK" : "Missing"}
                </span>
              )}
            </div>
            
            {!debug.clerkEnvOk && !debug.isServer && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                <p className="font-medium">Missing Clerk configuration!</p>
                <p className="mt-1">
                  Make sure you have the following environment variables set in your .env.local file:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</li>
                  <li>CLERK_SECRET_KEY</li>
                </ul>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-6">
          <a
            href="/"
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
} 