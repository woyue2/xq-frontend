import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg'],
      manifest: {
        name: '知识星球问答小程序',
        short_name: '知否',
        description: '初中知识问答平台',
        theme_color: '#3B82F6',
        background_color: '#ffffff',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://know-ans.vercel.app',
        changeOrigin: true,
        secure: false
      },
      '/static': {
        target: 'https://know-ans.vercel.app',
        changeOrigin: true,
        secure: false
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
    exclude: ['backend/**', 'node_modules/**', 'dist/**']
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
