import { HardhatUserConfig } from 'hardhat/config'
import { config } from 'dotenv'
import '@nomicfoundation/hardhat-toolbox'

config()

const hardHatConfig: HardhatUserConfig = {
  solidity: '0.8.16',
  networks: {
    hardhat: {},
    mumbai: {
      url: 'https://rpc-mumbai.maticvigil.com',
      accounts: [process.env.MUMBAI_ACCOUNT_PRIVATE_KEY!],
    },
  },
}

export default hardHatConfig
