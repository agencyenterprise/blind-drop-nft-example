import { ethers } from 'hardhat'
import { ContractFactory } from 'ethers'
import axios from 'axios'
import { textHash } from './hash'

async function main() {
  const address = process.env.NFT_ADDRESS

  const Contract = (await ethers.getContractFactory('BlindDrop')) as ContractFactory
  const contract = Contract.attach(address!)

  const baseURI = await contract.baseURI()
  const provenanceHash = await contract.provenanceHash()
  const maxSupply = await contract.maxSupply()

  let provenance = ''

  for (let i = 0; i < maxSupply.toNumber(); i++) {
    const { data } = await axios.get(`${baseURI.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')}${i}`, {
      headers: {
        Accept: 'text/plain',
      },
    })

    provenance += data.imageHash
  }

  const calculatedProvenanceHash = textHash(provenance)

  console.log(`Provenance hash is${provenanceHash == calculatedProvenanceHash ? '' : ' not'} valid:`)
  console.log('Smart contract provenance hash:', provenanceHash)
  console.log('Calculated provenance hash:', calculatedProvenanceHash)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
