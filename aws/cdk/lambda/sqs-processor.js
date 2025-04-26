const https = require('https');

exports.handler = async (event) => {
  console.log('Received SQS batch event with', event.Records.length, 'messages');
  
  // Get the VERCEL_APP_URL and API_KEY from environment variables
  const appUrl = process.env.VERCEL_APP_URL;
  const apiKey = process.env.LAMBDA_API_KEY;
  
  if (!appUrl) {
    throw new Error('VERCEL_APP_URL environment variable is not set');
  }
  
  if (!apiKey) {
    throw new Error('LAMBDA_API_KEY environment variable is not set');
  }
  
  try {
    // Make a single HTTP request to our Vercel API endpoint for the entire batch
    // Our API endpoint will process all pending messages
    const result = await makeHttpRequest(appUrl, apiKey);
    console.log('Successfully processed SQS messages batch via Vercel API:', result);
    return { statusCode: 200, body: 'Success' };
  } catch (error) {
    console.error('Error processing SQS message batch:', error);
    throw error; // Let Lambda retry based on your retry configuration
  }
};

/**
 * Makes an HTTP request to the Vercel API
 */
async function makeHttpRequest(appUrl, apiKey) {
  // Ensure we're only using the hostname and path
  const url = new URL('/api/process-sqs', appUrl);
  
  const options = {
    hostname: url.hostname,
    port: 443,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`Request failed with status code ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (e) => {
      reject(e);
    });
    
    // Send empty body - our endpoint doesn't need additional data
    req.write(JSON.stringify({}));
    req.end();
  });
} 