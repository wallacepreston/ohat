# Event-Driven Lambda Email Processor

This CDK project sets up an AWS Lambda function that is triggered by new SQS messages to process and send emails directly using SendGrid. This eliminates the need for API calls to your Vercel application and processes messages immediately when they arrive.

## Prerequisites

- Node.js 18 or later
- AWS CLI configured with appropriate credentials
- AWS CDK installed globally: `npm install -g aws-cdk`

## Setup

1. Install dependencies:

   ```bash
   cd aws/cdk
   npm install
   ```

2. Configure environment variables:
   Create a `.env` file in the `aws/cdk` directory with the following variables:

   ```bash
   EMAIL_QUEUE_URL=https://sqs.your-region.amazonaws.com/your-account-id/your-queue-name
   SENDGRID_API_KEY=your-sendgrid-api-key
   SENDGRID_FROM_EMAIL=instructors@example.com
   SENDGRID_INSTRUCTOR_REQUEST_TEMPLATE_ID=d-your-template-id
   SENDGRID_SEND_EMAILS_ENABLED=true
   SENDGRID_SEND_REAL_EMAILS=false
   SENDGRID_TO_EMAIL=test@example.com
   SUPPORT_EMAIL=instructors@example.com
   ```

   Note: If you don't provide an `EMAIL_QUEUE_URL`, a new SQS queue will be created.

3. Deploy the stack:

   ```bash
   cdk deploy
   ```

## How It Works

1. When a new message is added to the SQS queue, AWS automatically triggers the Lambda function
2. The Lambda function receives a batch of up to 10 messages from SQS
3. For each message, the Lambda sends an email using SendGrid
4. Successfully processed messages are automatically deleted from the queue
5. Failed messages are returned to the queue for automatic retry

## Security

- The SendGrid API key is securely stored as an environment variable in the Lambda function
- Make sure to keep your `SENDGRID_API_KEY` secret and rotate it regularly
- Email sending can be disabled by setting `SENDGRID_SEND_EMAILS_ENABLED=false`
- In development, emails can be redirected to a test address by setting `SENDGRID_SEND_REAL_EMAILS=false`

## Customization

- Adjust the Lambda function's timeout in `lib/sqs-lambda-stack.ts` if needed
- Modify the batch size and batching window for SQS message processing
- Update the Lambda function code in `lambda/sqs-processor.js` to fit your specific needs
