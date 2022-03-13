import { Stats } from 'node:fs'

export interface FileObject {
  path: string
  stat: Stats
  contents: Buffer
}
