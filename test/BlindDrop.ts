import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { MerkleTree } from 'merkletreejs'
import keccak256 from 'keccak256'

describe('BlindDrop', function () {
  async function deployNftFixture() {
    const name = 'TestDrop'
    const symbol = 'TSD'
    const provenanceHash = 'd48783479c5fcc13fbd28099ef2c060d8394e26d0a58d29be0fbcb35f83444a2'
    const maxSupply = 20
    const maxPurchase = 5
    const priceInWei = '80000000000000000'
    const baseURI = 'ipfs://QmVSft2Y6cjLkrYqL7MyABeikgKyp7ix3jRSrDtKVvJ38q/'

    const [owner, otherAccount, alice, bob, charlie] = await ethers.getSigners()

    const leaves = [alice.address, bob.address, charlie.address].map((a) => keccak256(a))
    const presaleMerkleTree = new MerkleTree(leaves, keccak256, { sort: true })

    const Nft = await ethers.getContractFactory('BlindDrop')
    const nft = await Nft.deploy(name, symbol, provenanceHash, maxSupply, maxPurchase, priceInWei)

    await nft.setPresaleMerkleRoot(presaleMerkleTree.getHexRoot())

    return {
      nft,
      owner,
      otherAccount,
      alice,
      name,
      symbol,
      provenanceHash,
      maxSupply,
      maxPurchase,
      priceInWei,
      baseURI,
      presaleMerkleTree,
    }
  }

  describe('Deployment', function () {
    it('Should set the right owner', async function () {
      const { nft, owner } = await loadFixture(deployNftFixture)

      expect(await nft.owner()).to.equal(owner.address)
    })

    it('Should set the right data', async function () {
      const { nft, name, symbol, provenanceHash, maxSupply, maxPurchase, priceInWei } = await loadFixture(
        deployNftFixture,
      )

      expect(await nft.name()).to.equal(name)
      expect(await nft.symbol()).to.equal(symbol)
      expect(await nft.provenanceHash()).to.equal(provenanceHash)
      expect(await nft.maxSupply()).to.equal(maxSupply)
      expect(await nft.maxPurchase()).to.equal(maxPurchase)
      expect(await nft.price()).to.equal(priceInWei)
    })
  })

  describe('NotStarted phase', function () {
    it('No account should claim NFTs in not started phase', async function () {
      // Arrange
      const { nft, otherAccount, alice } = await loadFixture(deployNftFixture)

      // Act & Assert
      await expect(nft.connect(otherAccount).claim(1, [], { value: 80000000000000000n })).to.be.revertedWith(
        'Sale is not open',
      )

      await expect(nft.connect(alice).claim(1, [], { value: 80000000000000000n })).to.be.revertedWith(
        'Sale is not open',
      )
    })
  })

  describe('Presale phase', function () {
    it('Account not in whitelist should not claim NFTs in presale phase', async function () {
      // Arrange
      const { nft, otherAccount, presaleMerkleTree } = await loadFixture(deployNftFixture)
      await nft.changePhase(1)
      const merkleProof = presaleMerkleTree.getHexProof(keccak256(otherAccount.address))

      // Act & Assert
      await expect(nft.connect(otherAccount).claim(1, merkleProof, { value: 80000000000000000n })).to.be.revertedWith(
        'Not in presale whitelist',
      )
    })

    it('Account in whitelist should claim NFTs in presale phase', async function () {
      // Arrange
      const { nft, alice, presaleMerkleTree } = await loadFixture(deployNftFixture)
      await nft.changePhase(1)
      const merkleProof = presaleMerkleTree.getHexProof(keccak256(alice.address))

      // Act
      await expect(nft.connect(alice).claim(2, merkleProof, { value: 160000000000000000n })).not.to.be.reverted

      // Assert
      expect(await nft.balanceOf(alice.address)).to.equal(2n)
    })
  })

  describe('Quantity', function () {
    it('Must send the correct amount of ether to claim NFTs', async function () {
      // Arrange
      const { nft, otherAccount } = await loadFixture(deployNftFixture)
      await nft.changePhase(2)

      // Act & Assert
      await expect(nft.connect(otherAccount).claim(1, [], { value: 70000000000000000n })).to.be.revertedWith(
        'Amount of ether sent is not correct',
      )
    })

    it('No account can claim more than maxPurchase NFTs in one transaction', async function () {
      // Arrange
      const { nft, otherAccount, alice } = await loadFixture(deployNftFixture)
      await nft.changePhase(2)

      // Act & Assert
      await expect(nft.connect(otherAccount).claim(6, [], { value: 80000000000000000n })).to.be.revertedWith(
        'Quantity exceeds number of tokens per transaction',
      )

      await expect(nft.connect(alice).claim(6, [], { value: 80000000000000000n })).to.be.revertedWith(
        'Quantity exceeds number of tokens per transaction',
      )
    })

    it('Cannot claim more than maxSupply NFTs', async function () {
      // Arrange
      const { nft, otherAccount, alice } = await loadFixture(deployNftFixture)
      await nft.changePhase(2)

      await nft.connect(otherAccount).claim(5, [], { value: 400000000000000000n })
      await nft.connect(otherAccount).claim(5, [], { value: 400000000000000000n })
      await nft.connect(otherAccount).claim(5, [], { value: 400000000000000000n })
      await nft.connect(otherAccount).claim(5, [], { value: 400000000000000000n })

      // Act & Assert
      await expect(nft.connect(alice).claim(1, [], { value: 80000000000000000n })).to.be.revertedWith(
        'Not enough lazy minted tokens',
      )
    })
  })

  describe('Reveal', function () {
    it('Before reveal should not have metadata', async function () {
      // Arrange
      const { nft } = await loadFixture(deployNftFixture)
      await nft.changePhase(2)
      await nft.claim(1, [], { value: 80000000000000000n })

      // Assert
      expect(await nft.tokenURI(0)).to.equal('')
    })

    it('After reveal should have metadata', async function () {
      // Arrange
      const { nft, baseURI } = await loadFixture(deployNftFixture)
      await nft.changePhase(2)
      await nft.claim(2, [], { value: 160000000000000000n })

      // Act
      await nft.reveal(baseURI)

      // Assert
      expect(await nft.tokenURI(0)).to.equal(`${baseURI}0`)
      expect(await nft.tokenURI(1)).to.equal(`${baseURI}1`)
    })
  })
})
