import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront"; // Import CloudFront module

export class S3BucketInfraStack extends cdk.Stack {
  public readonly websiteBucket: s3.Bucket;
  public readonly originAccessIdentity: cloudfront.OriginAccessIdentity;
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.websiteBucket = new s3.Bucket(this, "WebsiteBucket", {
      bucketName: "davidarevalo.xyz",
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "error.html",
      publicReadAccess: false, // Disable public read access
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // Block all public access
      versioned: true, // Enable versioning on the bucket
    });

    // Create a CloudFront origin access identity
    this.originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      "OriginAccessIdentity"
    );

    // Add a bucket policy to allow access only from CloudFront
    this.websiteBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [this.websiteBucket.arnForObjects("*")],
        principals: [this.originAccessIdentity.grantPrincipal],
      })
    );
  }
}
