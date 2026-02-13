import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Only enable PWA in production builds
const isProduction = process.env.NODE_ENV === 'production'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...(isProduction
      ? [
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
            manifest: {
              name: '知识星球问答小程序',
              short_name: '知否',
              description: '初中知识问答平台',
              theme_color: '#ffffff',
              icons: [
                {
                  src: 'pwa-192x192.png',
                  sizes: '192x192',
                  type: 'image/png'
                },
                {
                  src: 'pwa-512x512.png',
                  sizes: '512x512',
                  type: 'image/png'
                }
              ]
            }
          })
        ]
      : [])
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        // @reason: 后端服务默认运行在 4000 端口（见 backend/.env PORT 值）
        target: 'http://localhost:4000',
        changeOrigin: true
      },
      '/static': {
        // @reason: 后端静态资源（音频/图片）也从 4000 端口提供
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
  // @ts-ignore
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/test/setup.ts',
    // 只运行前端测试，避免拾取 backend 下的 Jest 用例
    include: ['src/test/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['backend/**', 'node_modules/**', 'dist/**'],
    envFile: '.env.test',  // ← 添加此行，强制使用 .env.test
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query', 'zustand'],
          ui: ['lucide-react', 'clsx', 'tailwind-merge', 'sonner'],
        },
      },
    },
  },
  theme: {
    extend: {
      colors: {
        morandi: {
          1: '#CCD5AE',
          2: '#E9EDC9',
          3: '#FEFAE0',
          4: '#FAEDCD',
          5: '#D4A373',
          pink1: '#FEC5BB',
          pink2: '#FCD5CE',
          pink3: '#FAE1DD',
          pink4: '#F8EDEB',
          gray1: '#E8E8E4',
          gray2: '#D8E2DC',
          gray3: '#ECE4DB',
          skin1: '#FFE5D9',
          skin2: '#FFD7BA',
          skin3: '#FEC89A',
        }
      }
    }
  }
})
