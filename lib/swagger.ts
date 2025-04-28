import fs from 'fs';
import path from 'path';

// Load the pre-generated OpenAPI specification
export const getApiDocs = () => {
  try {
    // Path to the generated OpenAPI JSON file
    const specPath = path.join(process.cwd(), 'public/docs/openapi.json');
    
    // Check if the file exists
    if (fs.existsSync(specPath)) {
      // Read and parse the OpenAPI JSON file
      const specFile = fs.readFileSync(specPath, 'utf-8');
      return JSON.parse(specFile);
    } else {
      // If the file doesn't exist, return a placeholder spec
      console.warn('OpenAPI specification file not found at public/docs/openapi.json');
      console.warn('Please run "npm run generate-api-docs" to generate the specification');
      
      return {
        openapi: '3.0.0',
        info: {
          title: 'Office Hours Automation Tool (OHAT) API',
          version: '1.0.0',
          description: 'API documentation is not available. Please run "npm run generate-api-docs" to generate it.',
        },
        paths: {}
      };
    }
  } catch (error) {
    console.error('Error loading OpenAPI specification:', error);
    return {
      openapi: '3.0.0',
      info: {
        title: 'Office Hours Automation Tool (OHAT) API',
        version: '1.0.0',
        description: 'Error loading API documentation. Please check the console for details.',
      },
      paths: {}
    };
  }
}; 