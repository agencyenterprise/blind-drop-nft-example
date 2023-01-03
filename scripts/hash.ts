import crypto from 'crypto'
import fs from 'fs'

export function imageHash(path: string): string {
  const file = fs.readFileSync(path)
  const hash = crypto.createHash('sha256').update(file)

  return hash.digest('hex')
}

export function textHash(text: string): string {
  const hash = crypto.createHash('sha256').update(text)

  return hash.digest('hex')
}
