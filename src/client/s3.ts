import S3 from 'aws-sdk/clients/s3'
import { AWSError } from 'aws-sdk/lib/error'
import { getType } from 'mime'
import { BinaryLike, createHash } from 'node:crypto'
import { promisify } from 'node:util'
import { gzip } from 'node:zlib'
import { chunk } from '../utils'

export class S3Client {
  private readonly client = new S3()
  private readonly bucket: string

  constructor(bucket: string) {
    this.bucket = bucket
  }

  async listObjects() {
    const objects: S3.Types.Object[] = []
    let response: S3.Types.ListObjectsV2Output | undefined
    do {
      const request: S3.Types.ListObjectsV2Request = {
        Bucket: this.bucket,
        ContinuationToken: response?.NextContinuationToken,
      }
      response = await this.client.listObjectsV2(request).promise()
      objects.push(...(response.Contents ?? []))
    } while (response.IsTruncated)
    return objects
  }

  async headObject(Key: string, contents?: Buffer) {
    const request: S3.Types.HeadObjectRequest = {
      Bucket: this.bucket,
      Key,
      IfNoneMatch: contents ? createHash('md5').update(contents).digest('hex') : undefined,
    }
    try {
      await this.client.headObject(request).promise()
    } catch (error) {
      const { statusCode } = error as AWSError
      if (statusCode === 304 || statusCode === 412) {
        // skip matches
      } else if (statusCode === 404) {
        // not found
      } else {
        // abort upload
      }
    }
  }

  async deleteObjects(objectKeys: Iterable<string>) {
    const requests = Array.from(chunk(objectKeys, 1000)).map(
      (keys): S3.Types.DeleteObjectsRequest => ({
        Bucket: this.bucket,
        Delete: { Objects: keys.map((Key) => ({ Key })) },
      }),
    )
    await Promise.all(requests.map((request) => this.client.deleteObjects(request).promise()))
  }

  async putObject(Key: string, Body: Buffer, options?: Partial<S3.Types.PutObjectRequest>) {
    const type = options?.ContentType ?? getType(Key) ?? 'application/octet-stream'
    const hash = getMD5(Body)
    const request: S3.Types.PutObjectRequest = {
      Bucket: this.bucket,
      Key,
      Body,
      ContentType: type,
      ContentLength: Body.byteLength,
      ContentMD5: hash,
      Metadata: { ETag: hash, ...options?.Metadata },
      ...options,
    }
    if (type.startsWith('text/')) {
      request.Body = promisify(gzip)(Body, { level: 9 })
      request.ContentEncoding = 'gzip'
    }
    return this.client.putObject(request).promise()
  }
}

function getMD5(chunk: BinaryLike) {
  return createHash('md5').update(chunk).digest('base64')
}
