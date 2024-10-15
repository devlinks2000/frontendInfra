#!/usr/bin/env node
import "source-map-support/register";
import "dotenv/config";
import * as cdk from "aws-cdk-lib";
import { FrontendInfraStack } from "../lib/frontend_infra-stack";

const app = new cdk.App();

const env: cdk.Environment = {
  account: process.env.AWS_ACCOUNT,
  region: process.env.AWS_REGION,
};

new FrontendInfraStack(app, "FrontendInfrastructureStack", {
  env,
  domain: process.env.AWS_DOMAIN_NAME!,
});
