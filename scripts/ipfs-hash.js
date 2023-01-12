const block = {
  get: async (cid) => {
    throw new Error(`unexpected block API get for ${cid}`)
  },
  put: async () => {
    throw new Error('unexpected block API put')
  },
}

async function hashFiles(path, options) {
  const { globSource } = await import('ipfs-http-client')
  const { importer } = await import('ipfs-unixfs-importer')

  options = {
    cidVersion: 0,
    hidden: true,
    onlyHash: true,
    ...options,
  }

  const files = globSource(path, '**')

  let lastCID
  for await (const c of importer(files, block, options)) {
    lastCID = c.cid
  }

  return lastCID.toString().replace('CID(', '').replace(')', '')
}

module.exports = {
  async hashFile(path) {
    return await hashFiles(path, {})
  },

  async hashFolder(path) {
    return await hashFiles(path, {
      wrapWithDirectory: true,
    })
  },
}
