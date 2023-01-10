import { MerkleTree } from 'merkletreejs'
import keccak256 from 'keccak256'

describe('Merkle tree', function () {
  it('Number of proofs', async function () {
    const leaves = [...Array(10000).keys()].map((a) => keccak256(`Account_${a}`))
    const merkleTree = new MerkleTree(leaves, keccak256, { sort: true })

    const merkleProof = merkleTree.getHexProof(keccak256(`Account_3500`))

    console.log(merkleProof.length)
  })
})
