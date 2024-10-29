import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as acm from "aws-cdk-lib/aws-certificatemanager"; // Import ACM module
import * as route53 from "aws-cdk-lib/aws-route53"; // Import Route 53 module
import * as route53targets from "aws-cdk-lib/aws-route53-targets"; // Import Route 53 targets module
import { Bucket, BucketAccessControl } from "aws-cdk-lib/aws-s3";
import { Distribution, OriginAccessIdentity } from "aws-cdk-lib/aws-cloudfront";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipelineActions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import { envs } from "../common/config";
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';

export class FrontendInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new Bucket(this, "Bucket", {
      bucketName: envs.awsDomainName,
      accessControl: BucketAccessControl.PRIVATE,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true, // Only for dev/test environments
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "index.html",
    });

    const originAccessIdentity = new OriginAccessIdentity(
      this,
      "OriginAccessIdentity"
    );

    bucket.grantRead(originAccessIdentity);

    const myCertificate = new acm.Certificate(this, "MyCertificate", {
      domainName: envs.awsDomainName,
      validation: acm.CertificateValidation.fromDns(), // Use DNS validation
    });

    const cf = new Distribution(this, "Distribution", {
      defaultRootObject: "index.html",
      defaultBehavior: {
        origin: new S3Origin(bucket, { originAccessIdentity }),
        viewerProtocolPolicy:
          cdk.aws_cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS, // Ensure HTTPS is used
      },
      errorResponses: [
        {
          httpStatus: 403, // Handle 403 Forbidden by returning index.html
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: cdk.Duration.seconds(0),
        },
      ],
      certificate: myCertificate,
      domainNames: [envs.awsDomainName],
    });

    const hostedZone = route53.HostedZone.fromLookup(this, "MyHostedZone", {
      domainName: envs.awsDomainName,
    });

    new route53.ARecord(this, "AliasRecord", {
      zone: hostedZone,
      recordName: envs.awsDomainName,
      target: route53.RecordTarget.fromAlias(
        new route53targets.CloudFrontTarget(cf)
      ),
      ttl: cdk.Duration.minutes(1),
    });

    new route53.ARecord(this, "AliasWWWRecord", {
      zone: hostedZone,
      recordName:`www.${envs.awsDomainName}`,
      target: route53.RecordTarget.fromAlias(
        new route53targets.CloudFrontTarget(cf)
      ),
      ttl: cdk.Duration.minutes(1),
    });

    const pipeline = new codepipeline.Pipeline(this, 'FrontendPipeline', {
      pipelineName: `${envs.awsDomainName}-pipeline`,
      crossAccountKeys: false,
    });

    const sourceOutput = new codepipeline.Artifact("SourceArtifact");
    const buildOutput = new codepipeline.Artifact("BuildArtifact");

    pipeline.addStage({
      stageName: 'Source',
      actions: [
        new codepipelineActions.CodeStarConnectionsSourceAction({
          actionName: 'GitHub_Source',
          owner: envs.githubRepositoryOwnerName,      
          repo: envs.githubRepositoryName,
          branch: envs.githubRepositoryBranchName,
          connectionArn: envs.githubConnectionArn,
          output: sourceOutput,
          triggerOnPush: true,
          codeBuildCloneOutput: true,
          variablesNamespace: 'SourceVariables',
        }),
      ],
    });

    const buildProject = new codebuild.PipelineProject(this, "BuildProject", {
      environment: {
         buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
         computeType: codebuild.ComputeType.SMALL,
  
      },
      buildSpec: codebuild.BuildSpec.fromObject({
         version: "0.2",
         phases: {
            install: {
               commands: ["npm install"]
            },
            build: {
               commands: ["npm run build"]
            }
         },
         artifacts: {
            "base-directory": "dist",
            files: ["**/*"]
         }
      })
   });
   
    pipeline.addStage({
      stageName: "Build",
      actions: [
        new codepipelineActions.CodeBuildAction({
          actionName: "Build",
          project: buildProject,
          input: sourceOutput,
          outputs: [buildOutput],
        }),
      ],
    });

    const snsTopic = new sns.Topic(this, 'ApprovalTopic', {
      displayName: 'Approval Notifications',
    });

    snsTopic.addSubscription(new snsSubscriptions.EmailSubscription(envs.approveDeployEmail));

    pipeline.addStage({
      stageName: "Deploy",
      actions: [
        new codepipelineActions.S3DeployAction({
          actionName: "S3Deploy",
          bucket: bucket,
          input: buildOutput,
        }),
        new codepipelineActions.ManualApprovalAction({
          actionName: "ApproveDeploy",
          notificationTopic: snsTopic,
          additionalInformation: "Approve the deployment to proceed.",
        }),
      ],
    });


  }
}
