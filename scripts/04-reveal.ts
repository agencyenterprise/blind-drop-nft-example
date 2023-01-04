import { ethers } from 'hardhat'
import { ContractFactory } from 'ethers'

async function main() {
  const address = process.env.NFT_ADDRESS
  const baseURI = process.env.BASE_URI

  const Contract = (await ethers.getContractFactory('BlindDrop')) as ContractFactory
  const contract = Contract.attach(address!)

  await contract.reveal(baseURI)

  console.log(`NFT revealed`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
