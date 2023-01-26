import { Contract, utils } from 'ethers'
import { abi } from '../artifacts/contracts/BlindDrop.sol/BlindDrop.json'

// These constants must match the ones used in the smart contract.
const SIGNING_DOMAIN_NAME = 'GOD-Voucher'
const SIGNING_DOMAIN_VERSION = '1'

export class VoucherGenerator {
  voucherContract
  kmsWallet

  constructor(voucherContractAddress, signer) {
    this.kmsWallet = signer
    this.voucherContract = new Contract(
      voucherContractAddress, abi, this.kmsWallet
    )
  }

  async generateVoucher(wallet, data) {
    const {
      name: domainName, version: domainVersion, verifyingContract, chainId
    } = await this.signingDomain()

    const callerNonce = await this.voucherContract.getCallerNonce(wallet)

    const voucher = {
      wallet,
      data,
      domainName,
      domainVersion,
      verifyingContract,
      chainId,
      callerNonce
    }
    const hashVoucher = await this.hashVoucher(voucher)
    const signature = await this.kmsWallet.signMessage(hashVoucher)
    return {
      wallet,
      data,
      signature
    }
  }

  async hashVoucher({
    wallet,
    data,
    domainName,
    domainVersion,
    verifyingContract,
    chainId,
    callerNonce
  }) {
    return Buffer.from(utils
      .solidityKeccak256(['address', 'string', 'uint256', 'string', 'string', 'address', 'uint256'],
        [wallet, data, chainId, domainName, domainVersion, verifyingContract, callerNonce])
      .slice(2),
    'hex')
  }

  async signingDomain() {
    const chainId = await this.voucherContract.getChainID()
    const domain = {
      name: SIGNING_DOMAIN_NAME,
      version: SIGNING_DOMAIN_VERSION,
      verifyingContract: this.voucherContract.address,
      chainId: chainId
    }
    return domain
  }
}
