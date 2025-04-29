"use client";

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import 'swagger-ui-react/swagger-ui.css';

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(
  () => import('swagger-ui-react').then((mod) => mod.default),
  { ssr: false }
);

export default function ApiDocs() {
  const [spec, setSpec] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch the swagger spec
  useEffect(() => {
    async function fetchSpec() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/swagger.json');
        if (!response.ok) {
          throw new Error(`Failed to load API documentation: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        
        // Check if we got an error response or a placeholder spec
        if (data.paths && Object.keys(data.paths).length === 0 && data.info?.description?.includes('documentation is not available')) {
          setError('API documentation has not been generated yet.');
        } else {
          setSpec(data);
          setError(null);
        }
      } catch (err) {
        console.error('Error loading Swagger spec:', err);
        setError(err instanceof Error ? err.message : 'Failed to load API documentation');
      } finally {
        setIsLoading(false);
      }
    }

    fetchSpec();
  }, []);

  // Add custom styling for Swagger UI to work well with dark/light mode
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .swagger-ui .opblock-tag,
      .swagger-ui .opblock .opblock-summary-description,
      .swagger-ui .opblock .opblock-description-wrapper p,
      .swagger-ui .response-col_status,
      .swagger-ui .response-col_description,
      .swagger-ui table thead tr td, 
      .swagger-ui table thead tr th,
      .swagger-ui .parameter__name,
      .swagger-ui .parameter__type,
      .swagger-ui .parameter__deprecated,
      .swagger-ui .parameter__in,
      .swagger-ui .parameter__type,
      .swagger-ui .tab li,
      .swagger-ui .opblock .opblock-section-header h4,
      .swagger-ui label,
      .swagger-ui .responses-inner h4,
      .swagger-ui .opblock-title_normal,
      .swagger-ui section.models h4 {
        color: #1a1a1a;
      }
      
      .swagger-ui, .swagger-ui .info .title {
        color: #3b4151;
      }
      
      .swagger-ui .scheme-container {
        background-color: white;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="p-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-gray-900">API Documentation</h1>
        <p className="mb-6 text-gray-700">
          This documentation describes the Office Hours Automation Tool API endpoints.
        </p>
        
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          {isLoading && (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-500 mx-auto mb-4"></div>
              <p>Loading API documentation...</p>
            </div>
          )}
          
          {error && (
            <div className="text-center py-10">
              <div className="text-red-600 mb-4">
                <p className="font-bold text-lg">Error</p>
                <p>{error}</p>
              </div>
              
              <div className="mt-8 p-4 bg-gray-50 rounded-lg text-left max-w-lg mx-auto">
                <h3 className="font-medium mb-2">To generate the API documentation:</h3>
                <div className="bg-gray-800 text-gray-200 p-3 rounded font-mono text-sm">
                  npm run docs
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  This will create the OpenAPI specification from your Zod schemas.
                </p>
              </div>
            </div>
          )}
          
          {!isLoading && !error && spec && (
            <SwaggerUI spec={spec} docExpansion="list" />
          )}
        </div>
      </div>
    </div>
  );
} 