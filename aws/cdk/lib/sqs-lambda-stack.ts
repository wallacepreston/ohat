import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';
import * as path from 'path';

export class SqsLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Get or create the SQS queue - use existing EMAIL_QUEUE_URL if available
    // This way you can use the queue already set up in your environment
    const queueUrl = process.env.EMAIL_QUEUE_URL;
    let queue;
    
    if (queueUrl) {
      // If queue URL is provided, import the existing queue
      // Convert the URL to an ARN
      // URL format: https://sqs.REGION.amazonaws.com/ACCOUNT_ID/QUEUE_NAME
      const urlParts = queueUrl.split('/');
      const queueName = urlParts[urlParts.length - 1];
      const accountId = urlParts[urlParts.length - 2];
      const region = urlParts[2].split('.')[1];
      
      const queueArn = `arn:aws:sqs:${region}:${accountId}:${queueName}`;
      queue = sqs.Queue.fromQueueArn(this, 'ImportedQueue', queueArn);
      
      // Output the existing queue URL for reference
      new cdk.CfnOutput(this, 'ExistingQueueUrl', {
        value: queueUrl,
        description: 'The URL of the existing SQS queue',
      });
    } else {
      // Create a new SQS queue if none exists
      queue = new sqs.Queue(this, 'InstructorCrawlQueue', {
        visibilityTimeout: cdk.Duration.seconds(300), // 5 minutes
        retentionPeriod: cdk.Duration.days(14),
      });
      
      // Output the new queue URL
      new cdk.CfnOutput(this, 'QueueUrl', {
        value: queue.queueUrl,
        description: 'The URL of the SQS queue',
      });
    }

    // Create a Lambda function that will be triggered by SQS messages
    const sqsProcessorLambda = new lambda.Function(this, 'SqsProcessorLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'sqs-processor.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      timeout: cdk.Duration.seconds(60),
      environment: {
        VERCEL_APP_URL: process.env.VERCEL_APP_URL || 'https://your-vercel-app.vercel.app',
        LAMBDA_API_KEY: process.env.LAMBDA_API_KEY || 'super-secret-api-key'
      },
    });

    // Add the SQS queue as an event source for the Lambda
    sqsProcessorLambda.addEventSource(new lambdaEventSources.SqsEventSource(queue, {
      batchSize: 10, // Process up to 10 messages at a time (maximum recommended)
      maxBatchingWindow: cdk.Duration.seconds(60), // Wait up to 60 seconds to collect messages
      enabled: true,
    }));

    // Grant the Lambda function permission to read from the SQS queue
    queue.grantConsumeMessages(sqsProcessorLambda);

    // Output the Lambda function name
    new cdk.CfnOutput(this, 'LambdaName', {
      value: sqsProcessorLambda.functionName,
      description: 'The name of the Lambda function',
    });
  }
} 