#!/usr/bin/env node
import "source-map-support/register";
import "dotenv/config";
import * as cdk from "aws-cdk-lib";
import { FrontendInfraStack } from "../lib/frontend_infra-stack";
import { envs } from "../common/config";

const app = new cdk.App();

const env: cdk.Environment = {
  account: envs.awsAccount,
  region: envs.awsRegion,
};

new FrontendInfraStack(app, "FrontendInfrastructureStack", {
  env
});
