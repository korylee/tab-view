import fs from 'node:fs'
import path from 'node:path'

const configPath = path.join(__dirname, '../config.json')

const config = (function () {
  try {
    const configData = fs.readFileSync(configPath, 'utf-8')
    return JSON.parse(configData)
  } catch (e) {
    console.error('Error reading config file', e)
    return {}
  }
})()

console.log('config-data', configPath, config)

export default config
