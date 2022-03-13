import CloudFront from 'aws-sdk/clients/cloudfront'

export async function invalidate(distId: string, paths: Set<string>) {
  const files = Array.from(paths).map((_) => (_.startsWith('/') ? _ : `/${_}`))
  const cf = new CloudFront()
  for (let i = 0; i < files.length; i += 3000) {
    const Items = files.slice(i, i + 3000)
    const request: CloudFront.Types.CreateInvalidationRequest = {
      DistributionId: distId,
      InvalidationBatch: {
        CallerReference: `s3-website-deploy-${Date.now()}`,
        Paths: { Quantity: Items.length, Items },
      },
    }
    await cf.createInvalidation(request).promise()
  }
}
