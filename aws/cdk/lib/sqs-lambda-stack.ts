import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';
import * as path from 'path';

export class SqsLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    // Use a custom synthesizer that doesn't require bootstrapping
    const synthesizer = new cdk.DefaultStackSynthesizer({
      // Disable the bootstrap stack version check
      generateBootstrapVersionRule: false,
    });

    // Pass the synthesizer to the parent constructor
    super(scope, id, {
      ...props,
      synthesizer,
    });

    // Get or create the SQS queue - use existing EMAIL_QUEUE_URL if available
    // This way you can use the queue already set up in your environment
    const queueUrl = process.env.EMAIL_QUEUE_URL;
    let queue;
    
    if (queueUrl) {
      try {
        // Convert the URL to an ARN
        // URL format: https://sqs.REGION.amazonaws.com/ACCOUNT_ID/QUEUE_NAME
        const urlParts = queueUrl.split('/');
        const queueName = urlParts[urlParts.length - 1];
        const accountId = urlParts[urlParts.length - 2];
        const queueRegion = urlParts[2].split('.')[1];
        
        // Check if queue region matches stack region
        const stackRegion = cdk.Stack.of(this).region;
        
        if (queueRegion !== stackRegion && stackRegion !== 'us-west-2') {
          throw new Error(`Queue region (${queueRegion}) must match Lambda region (${stackRegion}). Please deploy this stack to the ${queueRegion} region.`);
        }
        
        const queueArn = `arn:aws:sqs:${queueRegion}:${accountId}:${queueName}`;
        queue = sqs.Queue.fromQueueArn(this, 'ImportedQueue', queueArn);
        
        // Output the existing queue URL for reference
        new cdk.CfnOutput(this, 'ExistingQueueUrl', {
          value: queueUrl,
          description: 'The URL of the existing SQS queue',
        });
      } catch (error) {
        console.error('Error importing existing queue, creating a new one:', error);
        // Fall back to creating a new queue if import fails
        queue = new sqs.Queue(this, 'InstructorCrawlQueue', {
          visibilityTimeout: cdk.Duration.seconds(60), // Match Lambda timeout
          retentionPeriod: cdk.Duration.days(14),
        });
        
        new cdk.CfnOutput(this, 'NewQueueUrl', {
          value: queue.queueUrl,
          description: 'The URL of the new SQS queue',
        });
      }
    } else {
      // Create a new SQS queue if none exists
      queue = new sqs.Queue(this, 'InstructorCrawlQueue', {
        visibilityTimeout: cdk.Duration.seconds(60), // Match Lambda timeout
        retentionPeriod: cdk.Duration.days(14),
      });
      
      // Output the new queue URL
      new cdk.CfnOutput(this, 'QueueUrl', {
        value: queue.queueUrl,
        description: 'The URL of the SQS queue',
      });
    }

    // Create a Lambda function that will be triggered by SQS messages
    const sqsProcessorLambda = new lambda.Function(this, 'OHATInstructorEmailProcessor', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'sqs-processor.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      timeout: cdk.Duration.seconds(60),
      environment: {
        // SendGrid configuration
        SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',
        SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL || 'instructors@mheducation.com',
        SENDGRID_INSTRUCTOR_REQUEST_TEMPLATE_ID: process.env.SENDGRID_INSTRUCTOR_REQUEST_TEMPLATE_ID || '',
        SENDGRID_SEND_EMAILS_ENABLED: process.env.SENDGRID_SEND_EMAILS_ENABLED || 'false',
        SENDGRID_SEND_REAL_EMAILS: process.env.SENDGRID_SEND_REAL_EMAILS || 'false',
        SENDGRID_TO_EMAIL: process.env.SENDGRID_TO_EMAIL || 'test@example.com',
        SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || 'instructors@mheducation.com'
      },
    });

    // Add the SQS queue as an event source for the Lambda only if in the same region
    // Extract the queue region from the ARN
    const queueArn = queue.queueArn;
    const queueRegionMatch = queueArn.match(/arn:aws:sqs:([^:]+):/);
    const queueRegion = queueRegionMatch ? queueRegionMatch[1] : cdk.Stack.of(this).region;
    
    if (queueRegion === cdk.Stack.of(this).region) {
      sqsProcessorLambda.addEventSource(new lambdaEventSources.SqsEventSource(queue, {
        batchSize: 10, // Process up to 10 messages at a time (maximum recommended)
        maxBatchingWindow: cdk.Duration.seconds(60), // Wait up to 60 seconds to collect messages
        enabled: true,
      }));
      
      // Grant the Lambda function permission to read from the SQS queue
      queue.grantConsumeMessages(sqsProcessorLambda);
    } else {
      // If regions don't match, output a warning instead of creating an event source
      new cdk.CfnOutput(this, 'RegionMismatchWarning', {
        value: `WARNING: Queue (${queueRegion}) and Lambda (${cdk.Stack.of(this).region}) are in different regions. SQS trigger not created.`,
        description: 'Region mismatch warning',
      });
      
      // Provide instruction on manual Lambda invocation
      new cdk.CfnOutput(this, 'ManualInvocationInstructions', {
        value: `Create a separate Lambda in the ${queueRegion} region to poll this queue and invoke this Lambda.`,
        description: 'Manual invocation instructions',
      });
    }

    // Output the Lambda function name
    new cdk.CfnOutput(this, 'LambdaName', {
      value: sqsProcessorLambda.functionName,
      description: 'The name of the Lambda function',
    });
    
    // Output the Lambda region
    new cdk.CfnOutput(this, 'LambdaRegion', {
      value: cdk.Stack.of(this).region,
      description: 'The region of the Lambda function',
    });
  }
} 