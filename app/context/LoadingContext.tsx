"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  startLoading: () => void;
  stopLoading: () => void;
  loadingMessage: string;
  setLoadingMessage: (message: string) => void;
}

// Create context with default values
const LoadingContext = createContext<LoadingContextType>({
  isLoading: false,
  setLoading: () => {},
  startLoading: () => {},
  stopLoading: () => {},
  loadingMessage: 'Loading...',
  setLoadingMessage: () => {},
});

interface LoadingProviderProps {
  children: ReactNode;
}

// Create a provider component
export function LoadingProvider({ children }: LoadingProviderProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('Loading...');

  // Set loading state
  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  // Convenience methods
  const startLoading = useCallback(() => setIsLoading(true), []);
  const stopLoading = useCallback(() => setIsLoading(false), []);

  return (
    <LoadingContext.Provider 
      value={{ 
        isLoading, 
        setLoading, 
        startLoading, 
        stopLoading,
        loadingMessage,
        setLoadingMessage
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
}

// Custom hook to use the loading context
export const useLoading = () => useContext(LoadingContext); 