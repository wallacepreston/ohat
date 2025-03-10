"use client";

import React from 'react';
import { useLoading } from '@/app/context/LoadingContext';

export default function LoadingOverlay() {
  const { isLoading, loadingMessage } = useLoading();

  if (!isLoading) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-[150]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
      <p className="text-white text-lg font-medium">
        {loadingMessage || "Loading..."}
      </p>
    </div>
  );
} 