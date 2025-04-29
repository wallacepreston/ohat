"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, useAuth, useClerk } from "@clerk/nextjs";
import { useAuthenticatedFetch } from "@/lib/client-auth";

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { getToken } = useAuth();
  const [apiToken, setApiToken] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { authFetch } = useAuthenticatedFetch();
  
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">
          Loading user data...
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const generateApiToken = async () => {
    try {
      setIsGenerating(true);
      // Call the API to generate a token
      const response = await authFetch("/api/generate-token", {
        method: "POST",
      });

      const data = await response.json();
      if (data.token) {
        setApiToken(data.token);
      }
    } catch (error) {
      console.error("Error generating token:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (apiToken) {
      navigator.clipboard.writeText(apiToken);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-12 sm:px-6 lg:px-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg leading-6 font-medium text-gray-900">User Profile</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Personal details and account information</p>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Full name</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {user.firstName} {user.lastName}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Email address</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {user.primaryEmailAddress?.emailAddress}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">User ID</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {user.id}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Account created</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:px-6">
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Sign Out
                </button>
              </div>
            </dl>
          </div>
        </div>

        <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg leading-6 font-medium text-gray-900">API Tokens</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Generate an API token to access the Office Hours API programmatically.
            </p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            {apiToken ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your API Token</label>
                <div className="flex">
                  <input
                    type="text"
                    readOnly
                    value={apiToken}
                    className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md shadow-sm bg-gray-50"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-r-md hover:bg-indigo-700"
                  >
                    {isCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Include this token in the Authorization header as "Bearer {"{token}"}".
                </p>
              </div>
            ) : (
              <button
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 transition"
                onClick={generateApiToken}
                disabled={isGenerating}
              >
                {isGenerating ? "Generating..." : "Generate API Token"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 