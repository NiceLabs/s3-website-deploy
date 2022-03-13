import { getBooleanInput, getInput, getMultilineInput, group, info, setFailed } from '@actions/core'
import path from 'node:path'
import { invalidate } from './client/cloudfront'
import { S3Client } from './client/s3'
import { readFile } from './utils'

const client = new S3Client(getInput('bucket'))

async function deploy() {
  const folder = getInput('folder', { trimWhitespace: true }) || process.cwd()
  const objects = await client.listObjects()
  const allKeys = objects.map((obj) => obj.Key!)
  const diffedFiles = allKeys
  const removedKeys = allKeys
  await group('Upload', () => onUpload(folder, diffedFiles))
  if (getBooleanInput('delete-removed')) {
    await group('Delete Removed', () => onDeleteRemoved(removedKeys))
  }
  if (getBooleanInput('distribution-id')) {
    await group('Refresh CloudFront', onRefreshCloudFront)
  }
}

deploy().catch(setFailed)

async function onUpload(folder: string, diffedFiles: string[]) {
  for (const filePath of diffedFiles) {
    info(`Upload File: ${filePath}`)
    await client.putObject(await readFile(path.join(folder, filePath)), {
      ACL: 'private',
    })
  }
}

async function onDeleteRemoved(removedKeys: string[]) {
  for (const key of removedKeys) {
    info(`Delete File: ${key}`)
  }
  await client.deleteObjects(removedKeys)
}

async function onRefreshCloudFront() {
  const distributionId = getInput('distribution-id')
  const paths = new Set(getMultilineInput('invalidation-paths'))
  try {
    await invalidate(distributionId, paths)
  } catch (err) {
    if (err instanceof Error) {
      setFailed(err)
    }
  }
}
