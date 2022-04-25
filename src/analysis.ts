import { Object } from 'aws-sdk/clients/s3'
import fs from 'node:fs/promises'
import path from 'node:path'

export async function analysis(folder: string, objects: Object[]) {
  const diffedFiles: string[] = []
  const removedKeys: string[] = []
  for await (const filePath of walk(folder)) {
  }
  for (const { Key, ETag } of objects) {
    // ETag === `"${}"`
  }
  return {
    diffedFiles: diffedFiles.map((filePath) => ({ key: filePath, filePath })),
    removedKeys,
  }
}

async function* walk(from: string): AsyncGenerator<string> {
  for await (const dirent of await fs.opendir(from)) {
    const entry = path.join(from, dirent.name)
    if (dirent.name === '.git') {
      continue
    }
    if (dirent.isDirectory()) {
      yield* walk(entry)
    } else if (dirent.isFile()) {
      yield entry
    }
  }
}
