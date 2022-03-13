# Amazon S3 Website Deploy (GitHub Action)

## Configuration

```yaml
name: AWS S3 Deploy

on:
  push:
    branches:
      - main

jobs:
  run:
    runs-on: ubuntu-20.04
    env:
      # see https://docs.aws.amazon.com/en_us/cli/latest/userguide/cli-configure-envvars.html
      AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      AWS_REGION: ${{ secrets.AWS_REGION }}
    steps:
      - name: Deploy
        uses: NiceLabs/s3-website-deploy@main
        with:
          folder: dist
          bucket: ${{ secrets.S3_BUCKET }}
          dist-id: ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }}
          invalidation: /
          delete-removed: true
          no-cache: true
          private: true
```

## Policy template

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:GetObjectAcl",
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:ListBucket",
        "s3:ListMultipartUploadParts",
        "s3:AbortMultipartUpload",
        "s3:DeleteObject",
        "cloudfront:CreateInvalidation"
      ],
      "Resource": ["arn:aws:s3:::bucket-name", "arn:aws:s3:::bucket-name/*", "arn:aws:cloudfront::dist-arn"]
    }
  ]
}
```
