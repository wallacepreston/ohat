import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { readInstructorCrawlMessages } from './app/services/sqsService';
import { initializeSocket } from './app/lib/socket';
import dotenv from 'dotenv';
dotenv.config();

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Time interval in milliseconds for polling SQS (default: 15 seconds)
const POLLING_INTERVAL: number = parseInt(process.env.SQS_POLLING_INTERVAL || '15000', 10);

// Create the HTTP server
export const server = createServer((req, res) => {
  const parsedUrl = parse(req.url!, true);
  handle(req, res, parsedUrl);
});

// Initialize the application
app.prepare().then(() => {
  // Initialize Socket.IO with the HTTP server
  initializeSocket(server);
  console.log('Socket.IO initialized with server');

  // Start SQS message polling
  readInstructorCrawlMessages();

  // Start the server
  const port = process.env.PORT || 3000;
  server.listen(port, (err?: Error) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
    
    // Start the SQS polling mechanism
    console.log(`> Starting SQS polling (every ${POLLING_INTERVAL/1000} seconds)`);
    
    // Initial poll when the server starts
    readInstructorCrawlMessages().catch(err => 
      console.error('Error in initial SQS poll:', err)
    );
    
    // Set up regular polling
    setInterval(() => {
      readInstructorCrawlMessages().catch(err => 
        console.error('Error in SQS polling:', err)
      );
    }, POLLING_INTERVAL);
  });
}).catch(err => {
  console.error('Error starting server:', err);
  process.exit(1);
}); 