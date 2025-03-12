import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { readInstructorCrawlMessages } from './app/services/sqsService';
import dotenv from 'dotenv';
dotenv.config();

const dev: boolean = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Time interval in milliseconds for polling SQS (default: 15 seconds)
const POLLING_INTERVAL: number = parseInt(process.env.SQS_POLLING_INTERVAL || '15000', 10);

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    const parsedUrl = parse(req.url || '', true);
    await handle(req, res, parsedUrl);
  });

  server.listen(process.env.PORT || 3000, (err?: Error) => {
    if (err) throw err;
    const address = server.address();
    const port = typeof address === 'string' ? address : address?.port;
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