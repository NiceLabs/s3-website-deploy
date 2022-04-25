import CloudFront from 'aws-sdk/clients/cloudfront'
import { chunk } from '../utils'

export async function invalidate(distId: string, paths: Set<string>) {
  const files = Array.from(paths).map((_) => (_.startsWith('/') ? _ : `/${_}`))
  const reference = `s3-website-deploy-${Date.now()}`
  const requests = Array.from(chunk(files, 3000)).map(
    (Items, index): CloudFront.Types.CreateInvalidationRequest => ({
      DistributionId: distId,
      InvalidationBatch: {
        CallerReference: `${reference}-${index}`,
        Paths: { Quantity: Items.length, Items },
      },
    }),
  )
  const cf = new CloudFront()
  await Promise.all(requests.map(async (request) => cf.createInvalidation(request).promise()))
}
