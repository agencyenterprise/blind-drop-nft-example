# Solidity Blind Drop NFT Example

## This project demonstrates a basic Solidity NFT Blind Drop use case

### Install dependencies:

```shell
npm install
```

or

```shell
yarn
```

### Set environment variables:

Copy `.env.example` file to a `.env` file and set the environment variables properly

### Unit tests

The unit tests will help understand the basic usage of this smart contract!  
To execute the unit tests, run this command:

```shell
npx hardhat test
```

### Generate NFT metadata

Run this command:

```shell
npx hardhat run scripts/generate.ts
```

This command will do several actions:

- Upload all images on folder `scripts/nft/test/images` to IPFS
- Generate NFTs metadata json files based on file `nft.csv`
- Upload all metadata json files to IPFS
- Generate the `provenance hash` (to be used on smart contract deployment)
- Generate `baseURI` (to be used later on the smart contract, to reveal NFTs)
