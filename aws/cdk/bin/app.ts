#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SqsLambdaStack } from '../lib/sqs-lambda-stack';

// Get account and region from environment variables or use defaults
const account = process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION;

const app = new cdk.App();
new SqsLambdaStack(app, 'SqsLambdaStack', {
  /* Use explicit environment settings to ensure we deploy to the correct region */
  env: { 
    account,
    region
  },
});

app.synth(); 