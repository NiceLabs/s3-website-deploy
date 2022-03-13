import fs from 'node:fs/promises'
import path from 'node:path/posix'

export async function walk(from: string): Promise<string[]> {
  const entries: string[] = []
  for await (const entry of expand(from)) {
    entries.push(entry)
  }
  return entries
  async function* expand(from: string): AsyncGenerator<string> {
    for await (const dirent of await fs.opendir(from)) {
      const entry = path.join(from, dirent.name)
      if (dirent.name === '.git') {
        continue
      }
      if (dirent.isDirectory()) {
        yield* expand(entry)
      } else if (dirent.isFile()) {
        yield entry
      }
    }
  }
}

export async function readFile(filePath: string) {
  return {
    path: path.resolve(process.cwd(), filePath),
    stat: await fs.stat(filePath),
    contents: await fs.readFile(filePath),
  }
}
