# SQS to Lambda Integration for Vercel App

This CDK project sets up an AWS Lambda function that is triggered by messages in an SQS queue. The Lambda function calls your Vercel application's API endpoint to process SQS messages.

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
   VERCEL_APP_URL=https://your-vercel-app.vercel.app
   LAMBDA_API_KEY=super-secret-api-key
   EMAIL_QUEUE_URL=https://sqs.your-region.amazonaws.com/your-account-id/your-queue-name
   ```

   Note: If you don't provide an `EMAIL_QUEUE_URL`, a new SQS queue will be created.

3. Deploy the stack:

   ```bash
   cdk deploy
   ```

## Vercel Environment Variables

You need to add the following environment variable to your Vercel project:

- `LAMBDA_API_KEY`: The same secret key you used in the Lambda function environment variable

## How It Works

1. The AWS Lambda function is triggered when a message is added to the SQS queue
2. The Lambda function makes an HTTP request to your Vercel app's API endpoint `/api/process-sqs`
3. The Vercel API endpoint processes the SQS messages by calling your `readInstructorCrawlMessages` function

## Security

- Communication between Lambda and Vercel is secured with an API key
- Make sure to keep the `LAMBDA_API_KEY` secret and use a strong, unique key

## Customization

- Adjust the Lambda function's timeout in `lib/sqs-lambda-stack.ts` if needed
- Modify the batch size and batching window for SQS message processing
- Update the Lambda function code in `lambda/sqs-processor.js` to fit your specific needs
