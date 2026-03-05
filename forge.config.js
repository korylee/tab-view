const {
  AutoUnpackNativesPlugin
} = require('@electron-forge/plugin-auto-unpack-natives')
const { FusesPlugin } = require('@electron-forge/plugin-fuses')
const { FuseV1Options, FuseVersion } = require('@electron/fuses')
const path = require('node:path')

// 所有仅在渲染进程（前端页面）使用的库移动到 devDependencies 中。
// 例如：vue, vuetify, axios, pinia, vue-router 等。
// Vite 在编译时会处理这些依赖，打包后的代码不再需要读取 node_modules 中的源码。

// 主进程或预加载脚本真正依赖的原生模块或运行时库保留在 dependencies 中。
// 例如：electron-squirrel-startup, sqlite3, electron-store 或其他 Node.js 原生模块。

/**@type {import('@electron-forge/shared-types').ForgeConfig} */
module.exports = {
  packagerConfig: {
    ignore:
      /^\/?(electron-cache|electron|renderer|public|env|\.vue-devtools@6\.5\.1|\.idea|node_modules\/\.ignored)\//,
    asar: {
      unpack: 'config.json'
    },
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
