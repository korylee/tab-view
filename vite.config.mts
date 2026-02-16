import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import svgLoader from 'vite-svg-loader'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  envDir: path.resolve(__dirname, './env'),
  resolve: {
    alias: {}
  },
  plugins: [
    vue(),
    electron({
      main: {
        // Shortcut of `build.lib.entry`.
        entry: 'electron/main.ts',
        vite: {}
      },
      preload: {
        // Shortcut of `build.rollupOptions.input`.
        // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
        input: path.join(__dirname, 'electron/preload.ts')
      },
      // Ployfill the Electron and Node.js API for Renderer process.
      // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
      // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
      renderer: {}
    }),
    // AutoImport({
    //   resolvers: [
    //     ElementPlusResolver(),
    //     IconsResolver({
    //       prefix: 'Icon'
    //     })
    //   ],
    //   imports: ['vue', 'vue-router', 'pinia'],
    //   dts: 'src/auto-imports.d.ts'
    // }),
    // Components({
    //   resolvers: [
    //     ElementPlusResolver(),
    //     IconsResolver({
    //       enabledCollections: ['ep']
    //     })
    //   ],
    //   dirs: ['src/components'],
    //   dts: 'src/components.d.ts'
    // }),
    // Icons({
    //   autoInstall: true
    // }),
    // createSvgIconsPlugin({
    //   iconDirs: [path.resolve(__dirname, 'src/assets/icons')],
    //   symbolId: 'icon-[dir]-[name]', // 注意这里的icon- 前缀我在svgIcon.vue中写死了的，如果调整了记得同步改一下
    //   // 有特殊需求可不进行该配置
    //   svgoOptions: {
    //     // 删除一些填充的属性
    //     plugins: [
    //       {
    //         name: 'removeAttrs',
    //         params: { attrs: ['class', 'data-name', 'fill', 'stroke'] }
    //       },
    //       // 删除样式标签
    //       'removeStyleElement'
    //     ]
    //   }
    // }),
    tailwindcss({}),
    svgLoader({ defaultImport: 'component' }) // 默认作为组件导入
  ],
  build: {
    rollupOptions: {
      input: {
        tabs: path.resolve(__dirname, 'tabs.html'),
        downloads: path.resolve(__dirname, 'downloads.html'),
      },
      output: {
        dir: 'dist',
        entryFileNames: 'renderer/[name]/[name].js',
        chunkFileNames: 'renderer/[name]/[name].js'
        // assetFileNames: `renderer/[name]/[name][extname]`
      }
    },
    emptyOutDir: false // 防止清空 electron 构建输出
  },
  define: {},
  css: {
    preprocessorOptions: {
      scss: {}
    }
  }
})
