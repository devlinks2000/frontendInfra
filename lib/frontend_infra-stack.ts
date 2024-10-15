import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront"; // Import CloudFront module
import * as origins from "aws-cdk-lib/aws-cloudfront-origins"; // Import CloudFront origins module
import * as acm from "aws-cdk-lib/aws-certificatemanager"; // Import ACM module
import * as route53 from "aws-cdk-lib/aws-route53"; // Import Route 53 module
import * as route53targets from "aws-cdk-lib/aws-route53-targets"; // Import Route 53 targets module

interface FrontendInfraStackProps extends cdk.StackProps {
  websiteBucket: s3.Bucket;
  originAccessIdentity: cloudfront.OriginAccessIdentity;
}

export class FrontendInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FrontendInfraStackProps) {
    super(scope, id, props);

    const myCertificate = new acm.Certificate(this, "MyCertificate", {
      domainName: "davidarevalo.xyz",
      validation: acm.CertificateValidation.fromDns(), // Use DNS validation
    });

    const distribution = new cloudfront.Distribution(
      this,
      "WebsiteDistribution",
      {
        defaultBehavior: {
          origin: new origins.S3Origin(props.websiteBucket, {
            originAccessIdentity: props.originAccessIdentity, // Set the OAI
          }),
        },
        domainNames: ["davidarevalo.xyz"],
        certificate: myCertificate,
      }
    );

    const hostedZone = route53.HostedZone.fromLookup(this, "MyHostedZone", {
      domainName: "davidarevalo.xyz",
    });

    new route53.ARecord(this, "AliasRecord", {
      zone: hostedZone,
      recordName: "www.davidarevalo.xyz",
      target: route53.RecordTarget.fromAlias(
        new route53targets.CloudFrontTarget(distribution)
      ),
    });
  }
}
