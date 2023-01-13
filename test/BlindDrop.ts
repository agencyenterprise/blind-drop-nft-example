import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { VoucherGenerator } from './voucherGenerator'

const emptyVoucher = {
  data: '',
  wallet: '0x97CcF8F927045E4C5f936832d14904A68e595380',
  signature: [],
}

describe('BlindDrop', function () {
  async function deployNftFixture() {
    const name = 'TestDrop'
    const symbol = 'TSD'
    const contractLevelMetadataURI = '0123'
    const provenanceHash = 'd48783479c5fcc13fbd28099ef2c060d8394e26d0a58d29be0fbcb35f83444a2'
    const maxSupply = 20
    const maxPurchase = 5
    const priceInWei = '80000000000000000'
    const baseURI = 'ipfs://QmVSft2Y6cjLkrYqL7MyABeikgKyp7ix3jRSrDtKVvJ38q/'
    const placeholderURI = 'ipfs://QmX3bDzkvdHrAHG72YSXKFqGHTyujHk2hiUrFPXbpW7s4t'

    const [owner, otherAccount, alice, bob, voucherSigner] = await ethers.getSigners()
    const voucherSignerAddress = await voucherSigner.getAddress()

    const Nft = await ethers.getContractFactory('BlindDrop')
    const nft = await Nft.deploy(
      name,
      symbol,
      contractLevelMetadataURI,
      provenanceHash,
      placeholderURI,
      maxSupply,
      maxPurchase,
      priceInWei,
      voucherSignerAddress,
    )

    const voucherGenerator = new VoucherGenerator(nft.address, voucherSigner)

    return {
      nft,
      owner,
      otherAccount,
      alice,
      bob,
      name,
      symbol,
      contractLevelMetadataURI,
      provenanceHash,
      maxSupply,
      maxPurchase,
      priceInWei,
      baseURI,
      placeholderURI,
      voucherSignerAddress,
      voucherGenerator,
    }
  }

  describe('Deployment', function () {
    it('Should set the right owner', async function () {
      const { nft, owner } = await loadFixture(deployNftFixture)

      expect(await nft.owner()).to.equal(owner.address)
    })

    it('Should set the right data', async function () {
      const { nft, name, symbol, contractLevelMetadataURI, maxSupply, maxPurchase, priceInWei } = await loadFixture(
        deployNftFixture,
      )

      expect(await nft.name()).to.equal(name)
      expect(await nft.symbol()).to.equal(symbol)
      expect(await nft.contractURI()).to.equal(contractLevelMetadataURI)
      expect(await nft.maxSupply()).to.equal(maxSupply)
      expect(await nft.maxPurchase()).to.equal(maxPurchase)
      expect(await nft.price()).to.equal(priceInWei)
    })
  })

  describe('NotStarted phase', function () {
    it('No account should claim NFTs in not started phase', async function () {
      // Arrange
      const { nft, otherAccount, alice, voucherGenerator } = await loadFixture(deployNftFixture)
      const voucher = await voucherGenerator.generateVoucher(otherAccount.address, '')

      // Act & Assert
      await expect(nft.connect(otherAccount).claim(1, voucher, { value: 80000000000000000n })).to.be.revertedWith(
        'Sale is not open',
      )

      await expect(nft.connect(alice).claim(1, voucher, { value: 80000000000000000n })).to.be.revertedWith(
        'Sale is not open',
      )
    })
  })

  describe('PreSale phase', function () {
    it('Account not in allow list should not claim NFTs in pre sale phase', async function () {
      // Arrange
      const { nft, otherAccount } = await loadFixture(deployNftFixture)
      await nft.changePhase(1)

      // Act & Assert
      await expect(nft.connect(otherAccount).claim(1, emptyVoucher, { value: 80000000000000000n })).to.be.revertedWith(
        'ECDSA: invalid signature length',
      )
    })

    it('Account in allow list should claim NFTs in pre sale phase', async function () {
      // Arrange
      const { nft, alice, voucherGenerator } = await loadFixture(deployNftFixture)
      await nft.changePhase(1)
      const voucher = await voucherGenerator.generateVoucher(alice.address, '')

      // Act
      await expect(nft.connect(alice).claim(2, voucher, { value: 160000000000000000n })).not.to.be.reverted

      // Assert
      expect(await nft.balanceOf(alice.address)).to.equal(2n)
    })

    it('Account could not reuse voucher', async function () {
      // Arrange
      const { nft, otherAccount, voucherGenerator } = await loadFixture(deployNftFixture)
      await nft.changePhase(1)
      const voucher = await voucherGenerator.generateVoucher(otherAccount.address, '')

      await expect(nft.connect(otherAccount).claim(2, voucher, { value: 160000000000000000n })).not.to.be.reverted

      // Act & Assert
      await expect(nft.connect(otherAccount).claim(1, voucher, { value: 80000000000000000n })).to.be.revertedWith(
        'Voucher: Signature invalid or unauthorized',
      )
    })

    it('Account could not use voucher from someone else', async function () {
      // Arrange
      const { nft, otherAccount, voucherGenerator, alice } = await loadFixture(deployNftFixture)
      await nft.changePhase(1)
      const voucher = await voucherGenerator.generateVoucher(alice.address, '')

      // Act & Assert
      await expect(nft.connect(otherAccount).claim(1, voucher, { value: 80000000000000000n })).to.be.revertedWith(
        'Voucher: Invalid wallet',
      )
    })
  })

  describe('PublicSale phase', function () {
    it('Any account should claim NFTs in public sale phase', async function () {
      // Arrange
      const { nft, alice, bob } = await loadFixture(deployNftFixture)
      await nft.changePhase(2)

      // Act
      await expect(nft.connect(alice).claim(2, emptyVoucher, { value: 160000000000000000n })).not.to.be.reverted
      await expect(nft.connect(bob).claim(2, emptyVoucher, { value: 160000000000000000n })).not.to.be.reverted

      // Assert
      expect(await nft.balanceOf(alice.address)).to.equal(2n)
      expect(await nft.balanceOf(bob.address)).to.equal(2n)
    })
  })

  describe('Quantity', function () {
    it('Must send the correct amount of ether to claim NFTs', async function () {
      // Arrange
      const { nft, otherAccount } = await loadFixture(deployNftFixture)
      await nft.changePhase(2)

      // Act & Assert
      await expect(nft.connect(otherAccount).claim(1, emptyVoucher, { value: 70000000000000000n })).to.be.revertedWith(
        'Amount of ether sent is not correct',
      )
    })

    it('No account can claim more than maxPurchase NFTs in one transaction', async function () {
      // Arrange
      const { nft, otherAccount, alice } = await loadFixture(deployNftFixture)
      await nft.changePhase(2)

      // Act & Assert
      await expect(nft.connect(otherAccount).claim(6, emptyVoucher, { value: 80000000000000000n })).to.be.revertedWith(
        'Quantity exceeds number of tokens per transaction',
      )

      await expect(nft.connect(alice).claim(6, emptyVoucher, { value: 80000000000000000n })).to.be.revertedWith(
        'Quantity exceeds number of tokens per transaction',
      )
    })

    it('Cannot claim more than maxSupply NFTs', async function () {
      // Arrange
      const { nft, otherAccount, alice } = await loadFixture(deployNftFixture)
      await nft.changePhase(2)

      await nft.connect(otherAccount).claim(5, emptyVoucher, { value: 400000000000000000n })
      await nft.connect(otherAccount).claim(5, emptyVoucher, { value: 400000000000000000n })
      await nft.connect(otherAccount).claim(5, emptyVoucher, { value: 400000000000000000n })
      await nft.connect(otherAccount).claim(5, emptyVoucher, { value: 400000000000000000n })

      // Act & Assert
      await expect(nft.connect(alice).claim(1, emptyVoucher, { value: 80000000000000000n })).to.be.revertedWith(
        'Not enough lazy minted tokens',
      )
    })
  })

  describe('Reveal', function () {
    it('Before reveal should use placeholder metadata', async function () {
      // Arrange
      const { nft } = await loadFixture(deployNftFixture)
      await nft.changePhase(2)
      await nft.claim(1, emptyVoucher, { value: 80000000000000000n })

      // Assert
      expect(await nft.tokenURI(0)).to.equal('ipfs://QmX3bDzkvdHrAHG72YSXKFqGHTyujHk2hiUrFPXbpW7s4t')
    })

    it('After reveal should user base metadata', async function () {
      // Arrange
      const { nft, baseURI } = await loadFixture(deployNftFixture)
      await nft.changePhase(2)
      await nft.claim(2, emptyVoucher, { value: 160000000000000000n })

      // Act
      await nft.reveal(baseURI)

      // Assert
      expect(await nft.tokenURI(0)).to.equal(`${baseURI}0`)
      expect(await nft.tokenURI(1)).to.equal(`${baseURI}1`)
    })
  })
})
