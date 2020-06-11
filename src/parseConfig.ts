import fs from 'fs-extra'
import yaml from 'js-yaml'
import fileAccess from './utils/fileAccess'
import { Config } from './interfaces'

export default async function parseConfig(configFile: string) {
  if (!(await fileAccess(configFile, fs.constants.R_OK))) {
    throw new Error(`Cannot find config file at "${configFile}"`)
  }

  const content = await fs.readFile(configFile, 'utf8')
  return yaml.safeLoad(content) as Config
}
