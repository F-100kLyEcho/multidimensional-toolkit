import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

// https://vite.dev/config/
export default defineConfig(({ mode, command }) => {
  // Electron 模式下才启用插件
  const isElectron = mode === 'electron'
  // Electron 生产构建使用相对路径（无 VITE_DEV_SERVER_URL 时为生产构建）
  // 开发模式下 VITE_DEV_SERVER_URL 存在，使用默认 '/'
  const base = isElectron && !process.env.VITE_DEV_SERVER_URL ? './' : '/'

  return {
    base,
    plugins: [
      vue(),
      vueDevTools(),
      ...(isElectron
        ? [
            electron([
              {
                entry: 'electron/main.ts',
                vite: {
                  build: {
                    outDir: 'dist-electron',
                    rollupOptions: {
                      output: {
                        format: 'cjs',
                      },
                    },
                  },
                },
              },
              {
                entry: 'electron/preload.ts',
                vite: {
                  build: {
                    outDir: 'dist-electron',
                    rollupOptions: {
                      output: {
                        format: 'cjs',
                      },
                    },
                  },
                },
                onstart(args) {
                  args.reload()
                },
              },
            ]),
            renderer(),
          ]
        : []),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
