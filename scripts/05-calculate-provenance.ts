import fs from 'fs'
import { parse } from 'csv/sync'
import path from 'path'
import { textHash } from './hash'
import { removeFromIPFS, uploadDirectoryToIPFS } from './ipfs'
import { shuffle } from './util'

function buildMetadata(csvRecord: any, imagesIpfsHash: string): any {
  return {
    name: csvRecord[0].trim(),
    description: csvRecord[1].trim(),
    image: `${imagesIpfsHash}/${csvRecord[2].trim()}`,
    attributes: csvRecord
      .splice(3)
      .map((a: string) => ({ trait_type: a.split(':')[0].trim(), value: a.split(':')[1].trim() })),
  }
}

async function main() {
  const basePath = path.resolve('scripts', 'nft', 'test')
  const imagesPath = path.resolve(basePath, 'images')
  const metadatasPath = path.resolve(basePath, 'metadatas')
  const csvPath = path.resolve(basePath, 'nft.csv')

  const imagesIpfsHash = await uploadDirectoryToIPFS(imagesPath, 'images')
  await removeFromIPFS(imagesIpfsHash.replace('ipfs://', ''))

  const csvFile = fs.readFileSync(csvPath)
  const csvRecords = shuffle(parse(csvFile))

  if (!fs.existsSync(metadatasPath)) {
    fs.mkdirSync(metadatasPath)
  }

  let provenance = ''

  for (let i = 0; i < csvRecords.length; i++) {
    const metadata = buildMetadata(csvRecords[i], imagesIpfsHash)
    provenance += textHash(JSON.stringify(metadata))
  }

  console.log(textHash(provenance))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
