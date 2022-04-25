import { getBooleanInput, getInput, getMultilineInput, group, info, setFailed } from '@actions/core'
import fs from 'node:fs/promises'
import { analysis } from './analysis'
import { invalidate } from './client/cloudfront'
import { S3Client } from './client/s3'

const folder = getInput('folder', { trimWhitespace: true }) || process.cwd()
const client = new S3Client(getInput('bucket'))

async function deploy() {
  const { diffedFiles, removedKeys } = await analysis(folder, await client.listObjects())
  await group('Upload', () => onUpload(diffedFiles))
  if (getBooleanInput('delete-removed') && removedKeys.length > 0) {
    await group('Delete Removed', () => onDeleteRemoved(removedKeys))
  }
  if (getBooleanInput('distribution-id')) {
    await group('Refresh CloudFront', onRefreshCloudFront)
  }
}

deploy().catch(setFailed)

async function onUpload(diffedFiles: Array<{ key: string; filePath: string }>) {
  for await (const entry of diffedFiles) {
    info(`Upload File: ${entry.key}`)
    await client.putObject(entry.key, await fs.readFile(entry.filePath), {
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
