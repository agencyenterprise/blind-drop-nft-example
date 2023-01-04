import fs from 'fs'
import { parse } from 'csv/sync'
import path from 'path'
import { imageHash, textHash } from './hash'
import { uploadDirectoryToIPFS } from './ipfs'

function buildMetadata(csvRecord: any, imagesIpfsHash: string, imagesPath: string): any {
  return {
    name: csvRecord[0].trim(),
    description: csvRecord[1].trim(),
    image: `${imagesIpfsHash}/${csvRecord[2].trim()}`,
    imageHash: imageHash(path.resolve(imagesPath, csvRecord[2].trim())),
    attributes: csvRecord
      .splice(3)
      .map((a: string) => ({ trait_type: a.split(':')[0].trim(), value: a.split(':')[1].trim() })),
  }
}

function shuffle<T>(arr: T[]): T[] {
  // Fisher-Yates shuffle
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))

    const temp = arr[i]
    arr[i] = arr[j]
    arr[j] = temp
  }

  return arr
}

async function main() {
  const basePath = path.resolve('scripts', 'nft', 'test')
  const imagesPath = path.resolve(basePath, 'images')
  const metadatasPath = path.resolve(basePath, 'metadatas')
  const csvPath = path.resolve(basePath, 'nft.csv')

  console.log('Upload images to IPFS...')
  const imagesIpfsHash = await uploadDirectoryToIPFS(imagesPath, 'images')

  const csvFile = fs.readFileSync(csvPath)
  const csvRecords = shuffle(parse(csvFile))

  if (!fs.existsSync(metadatasPath)) {
    fs.mkdirSync(metadatasPath)
  }

  console.log('Building metadata json files and provenance hash...')
  let provenance = ''

  for (let i = 0; i < csvRecords.length; i++) {
    const metadata = buildMetadata(csvRecords[i], imagesIpfsHash, imagesPath)

    provenance += metadata.imageHash
    fs.writeFileSync(path.join(metadatasPath, `${i}`), JSON.stringify(metadata))
  }

  console.log('Upload metadata json files to IPFS...')
  const metadatasIpfsHash = await uploadDirectoryToIPFS(metadatasPath, 'metadatas')

  const provenanceHash = textHash(provenance)

  console.log('Please use this as "provenanceHash" argument when deploying the smart contract:', provenanceHash)
  console.log('Please use this as "baseURI" to reveal the NFTs:', metadatasIpfsHash + '/')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
