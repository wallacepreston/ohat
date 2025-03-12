import { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import dotenv from 'dotenv';
dotenv.config();

// Initialize the SQS client
const sqs = new SQSClient({
  region: process.env.AWS_REGION || 'us-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

/**
 * Sends an SQS message to queue a crawl task for an instructor
 * @param instructorId - The ID of the instructor to crawl
 * @param instructorName - The name of the instructor to crawl
 * @param email - The instructor's email
 * @param institution - The instructor's institution name
 * @returns Promise that resolves when message is sent
 */
export async function queueInstructorCrawl(
  instructorId: string, 
  instructorName: string,
  email: string,
  institution: string
): Promise<boolean> {
  try {
    // Prepare the message to send to SQS
    const command = new SendMessageCommand({
      QueueUrl: process.env.EMAIL_QUEUE_URL || '',
      MessageBody: JSON.stringify({ 
        instructorId, 
        instructorName,
        email,
        institution,
        timestamp: new Date().toISOString()
      })
    });

    // Send the message to SQS
    await sqs.send(command);
    console.log(`Successfully queued email to send for instructor: ${instructorId} - ${instructorName}`);
    return true;
  } catch (error) {
    console.error('Error sending SQS message:', error);
    return false;
  }
} 

/**
 * Reads messages from the SQS queue and logs their contents
 * @param maxMessages - Maximum number of messages to process at once (default: 5)
 * @param waitTimeSeconds - Long polling time in seconds (default: 5)
 * @returns Promise that resolves when processing is complete
 */
export async function readInstructorCrawlMessages(
  maxMessages: number = 5,
  waitTimeSeconds: number = 5
): Promise<void> {
  try {
    console.log('Reading messages from SQS queue...');
    
    // Create command to receive messages
    const receiveCommand = new ReceiveMessageCommand({
      QueueUrl: process.env.EMAIL_QUEUE_URL || '',
      MaxNumberOfMessages: maxMessages,
      WaitTimeSeconds: waitTimeSeconds // Long polling
    });

    // Send the receive command to SQS
    const response = await sqs.send(receiveCommand);
    
    // Check if any messages were received
    if (!response.Messages || response.Messages.length === 0) {
      console.log('No messages found in queue.');
      return;
    }

    console.log(`Retrieved ${response.Messages.length} messages from queue.`);
    
    // Process each received message
    for (const message of response.Messages) {
      try {
        // Parse the message body
        const messageBody = JSON.parse(message.Body || '{}');
        
        // Log message contents
        console.log('Processing message:', {
          MessageId: message.MessageId,
          Body: messageBody
        });
        
        // Here you would normally process the message (e.g., send email)
        // For now, we're just logging the contents
        console.log(`Would send email to instructor: ${messageBody.instructorId} <${messageBody.email}> at ${messageBody.institution}`);
        
        // Delete the message from the queue after processing
        await sqs.send(new DeleteMessageCommand({
          QueueUrl: process.env.EMAIL_QUEUE_URL || '',
          ReceiptHandle: message.ReceiptHandle || ''
        }));
        
        console.log(`Deleted message ${message.MessageId} from queue.`);
      } catch (messageError) {
        console.error('Error processing message:', messageError);
        // Continue processing other messages even if one fails
      }
    }
  } catch (error) {
    console.error('Error reading SQS messages:', error);
  }
} 