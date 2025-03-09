"use client";

import React, { createContext, useContext, useCallback } from 'react';
import { useToast, toast as showToast } from '@/hooks/use-toast';

// Define status types
export type StatusType = 'success' | 'error' | 'warning' | 'info';

interface StatusContextType {
  addStatusMessage: (type: StatusType, message: string) => void;
  clearStatusMessages: () => void;
}

// Map our status types to shadcn toast variants
const statusToVariant = {
  'success': 'success',
  'error': 'destructive', 
  'warning': 'warning',
  'info': 'info'
} as const;

// Create context with default values
const StatusContext = createContext<StatusContextType>({
  addStatusMessage: () => {},
  clearStatusMessages: () => {},
});

// Create a provider component
export function StatusProvider({ children }: { children: React.ReactNode }) {
  const { dismiss } = useToast();

  // Add a new status message as a toast
  const addStatusMessage = useCallback((type: StatusType, message: string) => {
    const title = type.charAt(0).toUpperCase() + type.slice(1);
    
    showToast({
      title,
      description: message,
      variant: statusToVariant[type],
      // Reasonable default duration
      duration: 5000
    });
  }, []);

  // Clear all status messages
  const clearStatusMessages = useCallback(() => {
    dismiss("all");
  }, [dismiss]);

  return (
    <StatusContext.Provider value={{ addStatusMessage, clearStatusMessages }}>
      {children}
    </StatusContext.Provider>
  );
}

// Custom hook to use the status context
export function useStatus() {
  const context = useContext(StatusContext);
  if (context === undefined) {
    throw new Error('useStatus must be used within a StatusProvider');
  }
  return context;
}

// Keep track of toast timeouts
const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>(); 