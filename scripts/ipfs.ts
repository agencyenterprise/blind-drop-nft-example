import fs from 'fs'
import path from 'path'
import axios from 'axios'
import FormData from 'form-data'
import streamBuffers from 'stream-buffers'

const pinataApiUrl = 'https://api.pinata.cloud/pinning/pinFileToIPFS'
const pinataKey = process.env.PINATA_KEY
const pinataSecret = process.env.PINATA_SECRET

const addIPFSPrefix = (hash: string) => `ipfs://${hash}`

function createStreamFromBuffer(buffer: any) {
  const readableStreamBuffer = new streamBuffers.ReadableStreamBuffer({
    frequency: 10,
    chunkSize: 2048,
  })

  readableStreamBuffer.put(buffer)
  readableStreamBuffer.stop()

  return readableStreamBuffer
}

async function createFileFormData(basePath: string, folderNameOnIpfs: string): Promise<FormData> {
  const formData = new FormData()
  const files = fs.readdirSync(basePath)

  for (let f of files) {
    formData.append('file', fs.createReadStream(path.join(basePath, f)), {
      filepath: `./${folderNameOnIpfs}/${f}`,
    })
  }

  return formData
}

const uploadFileToIPFS = async (stream: any, name?: any): Promise<string> => {
  const formData = new FormData()
  formData.append('file', stream, name)

  const { data } = await axios.post(pinataApiUrl, formData, {
    maxContentLength: Infinity,
    headers: {
      'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
      pinata_api_key: pinataKey,
      pinata_secret_api_key: pinataSecret,
    },
  })

  return addIPFSPrefix(data.IpfsHash)
}

export const uploadTextFileToIPFS = async (text: string, fileName: string): Promise<string> => {
  return await uploadFileToIPFS(createStreamFromBuffer(text), fileName)
}

export async function uploadDirectoryToIPFS(folderPath: string, folderNameOnIpfs: string): Promise<string> {
  const formData = await createFileFormData(folderPath, folderNameOnIpfs)

  const { data } = await axios.post(pinataApiUrl, formData, {
    maxContentLength: Infinity,
    headers: {
      'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
      pinata_api_key: pinataKey,
      pinata_secret_api_key: pinataSecret,
    },
  })

  return addIPFSPrefix(data.IpfsHash)
}
