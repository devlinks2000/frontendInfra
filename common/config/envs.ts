import 'dotenv/config';
import * as joi from 'joi';


interface EnvVars {
    AWS_ACCOUNT: string
    AWS_REGION: string
    AWS_DOMAIN_NAME: string
    GITHUB_CONNECTION_ARN: string
    GITHUB_REPOSITORY_BRANCH_NAME: string
    GITHUB_REPOSITORY_NAME: string
    GITHUB_REPOSITORY_OWNER_NAME: string
    APPROVE_DEPLOY_EMAIL: string
}

const envsSchema = joi
  .object({
    AWS_ACCOUNT: joi.string().required(),
    AWS_REGION: joi.string().required(),
    AWS_DOMAIN_NAME: joi.string().required(),
    GITHUB_CONNECTION_ARN: joi.string().required(),
    GITHUB_REPOSITORY_BRANCH_NAME: joi.string().required(),
    GITHUB_REPOSITORY_NAME: joi.string().required(),
    GITHUB_REPOSITORY_OWNER_NAME: joi.string().required(),
    APPROVE_DEPLOY_EMAIL: joi.string().required()
  })
  .unknown(true);

const { error, value } = envsSchema.validate(process.env);

if (error) {
  throw new Error(`Config Validation Error: ${error.message}`);
}

const envVars: EnvVars = value;

export const envs = {
    awsAccount: envVars.AWS_ACCOUNT,
    awsRegion: envVars.AWS_REGION,
    awsDomainName: envVars.AWS_DOMAIN_NAME,
    githubConnectionArn: envVars.GITHUB_CONNECTION_ARN,
    githubRepositoryBranchName: envVars.GITHUB_REPOSITORY_BRANCH_NAME,
    githubRepositoryName: envVars.GITHUB_REPOSITORY_NAME,
    githubRepositoryOwnerName: envVars.GITHUB_REPOSITORY_OWNER_NAME,
    approveDeployEmail: envVars.APPROVE_DEPLOY_EMAIL
};