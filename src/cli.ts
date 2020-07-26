#!/usr/bin/env node
import parseConfig from './parseConfig'
import MeiliSync from '.'

const start = async () => {
  const configFile = process.argv[2]

  if (!configFile) {
    console.log('Usage: meili-sync <configFile>')
    process.exit(0)
  }

  const config = await parseConfig(configFile)
  config.sync.forEach((sync) => {
    const meiliSync = new MeiliSync(config, sync)
    meiliSync.initialize().catch((err) => {
      console.error(err)
      process.exit(1)
    })
  })
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
