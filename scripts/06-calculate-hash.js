const { hashFile, hashFolder } = require('./ipfs-hash')

hashFolder('./scripts/nft/test/images').then((h) => console.log('folder:', h))
hashFile('./scripts/nft/test/images/tree1.png').then((h) => console.log('file:', h))
