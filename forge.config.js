const {
  AutoUnpackNativesPlugin
} = require('@electron-forge/plugin-auto-unpack-natives')
const { FusesPlugin } = require('@electron-forge/plugin-fuses')
const { FuseV1Options, FuseVersion } = require('@electron/fuses')
const path = require('node:path')

/**@type {import('@electron-forge/shared-types').ForgeConfig} */
module.exports = {
  packagerConfig: {
    asar: {
      unpack: 'config.json'
    },
    ignore: /\/(electron-cache|renderer|\.vue-devtools@6\.5\.1)\/|env/,
    download: {
      cacheMode: 0,
      cacheRoot: path.resolve(__dirname, 'electron-cache'),
      mirrorOptions: {
        mirror: 'https://mirrors.huaweicloud.com/electron/'
      }
    },
    electronZipDir: path.resolve(__dirname, 'electron-cache/')
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {}
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32', 'linux']
    },
    {
      name: '@electron-forge/maker-deb',
      platforms: ['linux'],
      config: {}
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {}
    }
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: false
    })
  ],
  electronRebuildConfig: {
    onlyModules: [],
    force: false,
    offline: true
  }
}
