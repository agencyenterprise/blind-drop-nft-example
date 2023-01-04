import { ethers } from 'hardhat'
import { ContractFactory } from 'ethers'

async function main() {
  const address = process.env.NFT_ADDRESS

  const Contract = (await ethers.getContractFactory('BlindDrop')) as ContractFactory
  const contract = Contract.attach(address!)

  await contract.changePhase(2)
  await contract.claim(3, [], { value: 240000000000000000n })

  console.log(`NFTs claimed`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
