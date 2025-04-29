"use client";

import { useEffect, useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { EmailLinkErrorCode } from "@clerk/nextjs/errors";
import Link from "next/link";

export default function VerifyPage() {
  const [verificationStatus, setVerificationStatus] = useState("loading");
  const { handleEmailLinkVerification, loaded } = useClerk();

  useEffect(() => {
    if (!loaded) return;

    const verify = async () => {
      try {
        await handleEmailLinkVerification({
          redirectUrlComplete: "/",
          redirectUrl: "/sign-up",
          onVerifiedOnOtherDevice: () => {
            // Handle verification on another device if needed
            setVerificationStatus("verified_other_device");
          },
        });

        // If not redirected at this point, verification was successful
        setVerificationStatus("verified");
      } catch (err: any) {
        console.error("Verification error:", err);
        
        // Handle specific error cases
        if (err.code === EmailLinkErrorCode.Expired) {
          setVerificationStatus("expired");
        } else if (err.code === EmailLinkErrorCode.Failed) {
          setVerificationStatus("failed");
        } else {
          setVerificationStatus("failed");
        }
      }
    };

    verify();
  }, [handleEmailLinkVerification, loaded]);

  if (verificationStatus === "loading") {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Verifying...</h1>
        <p>Please wait while we verify your email.</p>
      </div>
    </div>;
  }

  if (verificationStatus === "expired") {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Link Expired</h1>
        <p className="mb-4">The verification link has expired.</p>
        <Link href="/sign-up" className="text-blue-600 hover:underline">
          Return to sign up
        </Link>
      </div>
    </div>;
  }

  if (verificationStatus === "failed") {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Verification Failed</h1>
        <p className="mb-4">We couldn't verify your email. Please try again.</p>
        <Link href="/sign-up" className="text-blue-600 hover:underline">
          Return to sign up
        </Link>
      </div>
    </div>;
  }

  if (verificationStatus === "verified_other_device") {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Verification Successful</h1>
        <p className="mb-4">Your email has been verified on another device.</p>
        <Link href="/login" className="text-blue-600 hover:underline">
          Sign in
        </Link>
      </div>
    </div>;
  }

  return <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-2xl font-bold mb-4">Verification Successful</h1>
      <p className="mb-4">Your email has been verified. You can now sign in.</p>
      <Link href="/login" className="text-blue-600 hover:underline">
        Sign in
      </Link>
    </div>
  </div>;
} 