import { ethers } from 'hardhat'
import { ContractFactory } from 'ethers'

async function main() {
  const name = 'TestDrop'
  const symbol = 'TSD'
  const provenanceHash = 'd48783479c5fcc13fbd28099ef2c060d8394e26d0a58d29be0fbcb35f83444a2'
  const maxSupply = 20
  const maxPurchase = 5
  const priceInWei = '80000000000000000'

  console.log('Deploying contract...')

  const Contract = (await ethers.getContractFactory('BlindDrop')) as ContractFactory
  const contract = await Contract.deploy(name, symbol, provenanceHash, maxSupply, maxPurchase, priceInWei)

  await contract.deployed()

  console.log(`Contract deployed to address ${contract.address}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
