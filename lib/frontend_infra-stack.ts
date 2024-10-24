import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as acm from "aws-cdk-lib/aws-certificatemanager"; // Import ACM module
import * as route53 from "aws-cdk-lib/aws-route53"; // Import Route 53 module
import * as route53targets from "aws-cdk-lib/aws-route53-targets"; // Import Route 53 targets module
import { Bucket, BucketAccessControl } from "aws-cdk-lib/aws-s3";
import { Distribution, OriginAccessIdentity } from "aws-cdk-lib/aws-cloudfront";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";

interface FrontendInfraStackProps extends cdk.StackProps {
  domain: string;
}

export class FrontendInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FrontendInfraStackProps) {
    super(scope, id, props);

    const bucket = new Bucket(this, "Bucket", {
      bucketName: props.domain,
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
      domainName: props.domain,
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
      domainNames: [props.domain],
    });

    const hostedZone = route53.HostedZone.fromLookup(this, "MyHostedZone", {
      domainName: props.domain,
    });

    new route53.ARecord(this, "AliasRecord", {
      zone: hostedZone,
      recordName: props.domain,
      target: route53.RecordTarget.fromAlias(
        new route53targets.CloudFrontTarget(cf)
      ),
      ttl: cdk.Duration.minutes(1),
    });

    new route53.ARecord(this, "AliasWWWRecord", {
      zone: hostedZone,
      recordName: `www.${props.domain}`,
      target: route53.RecordTarget.fromAlias(
        new route53targets.CloudFrontTarget(cf)
      ),
      ttl: cdk.Duration.minutes(1),
    });
  }
}
