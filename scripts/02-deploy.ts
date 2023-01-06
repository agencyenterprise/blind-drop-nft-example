import { ethers } from 'hardhat'
import { ContractFactory } from 'ethers'

function buildContractLevelMetadata(name: string, description: string) {
  const contractLevelMetadataBuffer = Buffer.from(
    JSON.stringify({
      name: name,
      description: description,
      image: 'https://metatreesnft.com/wp-content/uploads/2022/02/LightGreen-300x300.png',
      external_link: '',
    }),
  )

  const contractLevelMetadata = contractLevelMetadataBuffer.toString('base64')

  return `data:application/json;base64,${contractLevelMetadata}`
}

async function main() {
  const name = 'TestDrop'
  const description = 'TestDrop NFT description'
  const symbol = 'TSD'
  const contractLevelMetadata = buildContractLevelMetadata(name, description)
  const maxSupply = 5
  const maxPurchase = 2
  const priceInWei = '80000000000000000'

  console.log('Deploying contract...')

  const Contract = (await ethers.getContractFactory('BlindDrop')) as ContractFactory
  const contract = await Contract.deploy(name, symbol, contractLevelMetadata, maxSupply, maxPurchase, priceInWei)

  await contract.deployed()

  console.log(`Contract deployed to address ${contract.address}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
