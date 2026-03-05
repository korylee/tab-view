import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron'
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
    electron([
      { entry: 'electron/main.ts' },
      {
        entry: 'electron/preload.ts'
      }
    ]),
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
        tab: path.resolve(__dirname, 'tab.html'),
        download: path.resolve(__dirname, 'download.html')
      },
      output: {
        dir: 'dist'
        // entryFileNames: 'renderer/[name]/[name].js',
        // chunkFileNames: 'renderer/[name]/[name].js'
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
