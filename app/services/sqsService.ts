import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

// Initialize the SQS client with environment variables
const sqs = new SQSClient({ 
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

/**
 * Sends an SQS message to queue a crawl task for an instructor
 * @param instructorId - The ID of the instructor to crawl
 * @param email - The instructor's email
 * @param institution - The instructor's institution name
 * @returns Promise that resolves when message is sent
 */
export async function queueInstructorCrawl(
  instructorId: string, 
  email: string,
  institution: string
): Promise<boolean> {
  try {
    // Prepare the message to send to SQS
    const command = new SendMessageCommand({
      QueueUrl: process.env.EMAIL_QUEUE_URL || '',
      MessageBody: JSON.stringify({ 
        instructorId, 
        email,
        institution,
        timestamp: new Date().toISOString()
      })
    });

    // Send the message to SQS
    await sqs.send(command);
    console.log(`Successfully queued email to send for instructor: ${instructorId}`);
    return true;
  } catch (error) {
    console.error('Error sending SQS message:', error);
    return false;
  }
} 