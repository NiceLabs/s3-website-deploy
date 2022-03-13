import S3 from 'aws-sdk/clients/s3'
import { getType } from 'mime'
import { BinaryLike, createHash } from 'node:crypto'
import { promisify } from 'node:util'
import { gzip } from 'node:zlib'
import { FileObject as FileEntry } from './types'

export class S3Client {
  private readonly client = new S3()
  private readonly bucket: string

  constructor(bucket: string) {
    this.bucket = bucket
  }

  async listObjects() {
    const objects: S3.Types.Object[] = []
    let token: string | undefined
    while (true) {
      const params: S3.Types.ListObjectsV2Request = {
        Bucket: this.bucket,
        ContinuationToken: token,
      }
      const response = await this.client.listObjectsV2(params).promise()
      objects.push(...(response.Contents ?? []))
      if (response.IsTruncated) break
      token = response.NextContinuationToken
    }
    return objects
  }

  async deleteObjects(keys: string[]) {
    for (let i = 0; i < keys.length; i += 1000) {
      const Objects = keys.slice(i, i + 1000).map((Key) => ({ Key }))
      const request: S3.Types.DeleteObjectsRequest = {
        Bucket: this.bucket,
        Delete: { Objects },
      }
      await this.client.deleteObjects(request).promise()
    }
  }

  async putObject(entry: FileEntry, options?: Partial<S3.Types.PutObjectRequest>) {
    const type = options?.ContentType ?? getType(entry.path) ?? 'application/octet-stream'
    const hash = getBase64MD5(entry.contents)
    const request: S3.Types.PutObjectRequest = {
      Bucket: this.bucket,
      Key: entry.path,
      Body: entry.contents,
      ContentType: type,
      ContentMD5: hash,
      Metadata: { ETag: hash, ...options?.Metadata },
      ...options,
    }
    if (type.startsWith('text/')) {
      request.Body = promisify(gzip)(entry.contents, { level: 9 })
      request.ContentEncoding = 'gzip'
    }
    return this.client.putObject(request).promise()
  }
}

function getBase64MD5(chunk: BinaryLike) {
  return createHash('md5').update(chunk).digest('base64')
}
