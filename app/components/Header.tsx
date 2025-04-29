"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser, useClerk, UserButton } from "@clerk/nextjs";

export default function Header() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <header className="bg-white shadow">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3">
          <div>
            <Link href="/" className="text-xl font-bold text-gray-900">
              OHAT
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {!isLoaded ? (
              <div className="h-8 w-20 bg-gray-100 animate-pulse rounded"></div>
            ) : user ? (
              <div className="flex items-center space-x-4">
                <Link
                  href="/profile"
                  className="text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center mr-2">
                      {user.firstName?.charAt(0) || user.emailAddresses[0]?.emailAddress?.charAt(0) || "U"}
                    </div>
                    <span className="hidden md:inline">
                      {user.fullName || user.emailAddresses[0]?.emailAddress}
                    </span>
                  </div>
                </Link>
                <button 
                  onClick={handleSignOut}
                  className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-1 px-3 rounded"
                >
                  Sign out
                </button>
                {/* Alternate: Use Clerk's UserButton */}
                {/* <UserButton afterSignOutUrl="/" /> */}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <button className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-1 px-3 rounded">
                    Sign in
                  </button>
                </Link>
                <Link href="/sign-up">
                  <button className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-1 px-3 rounded">
                    Sign up
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
} 