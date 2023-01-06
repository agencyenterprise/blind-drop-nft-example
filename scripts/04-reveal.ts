import { ethers } from 'hardhat'
import { ContractFactory } from 'ethers'

async function main() {
  const address = process.env.NFT_ADDRESS
  const baseURI = process.env.BASE_URI
  const provenanceHash = 'd48783479c5fcc13fbd28099ef2c060d8394e26d0a58d29be0fbcb35f83444a2'

  const Contract = (await ethers.getContractFactory('BlindDrop')) as ContractFactory
  const contract = Contract.attach(address!)

  await contract.reveal(baseURI, provenanceHash)

  console.log(`NFT revealed`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
