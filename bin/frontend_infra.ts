#!/usr/bin/env node
import "source-map-support/register";
import "dotenv/config";
import * as cdk from "aws-cdk-lib";
import { FrontendInfraStack } from "../lib/frontend_infra-stack";
import { S3BucketInfraStack } from "../lib/s3_bucket_infra_stack";

const app = new cdk.App();

const env: cdk.Environment = {
  account: process.env.AWS_ACCOUNT,
  region: process.env.AWS_REGION,
};

const s3Bucket = new S3BucketInfraStack(app, "S3Bucket", {
  env,
});

new FrontendInfraStack(app, "FrontendInfraStack", {
  env,
  websiteBucket: s3Bucket.websiteBucket,
  originAccessIdentity: s3Bucket.originAccessIdentity,
});
