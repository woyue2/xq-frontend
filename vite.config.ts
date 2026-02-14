import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Only enable PWA in production builds
const isProduction = process.env.NODE_ENV === 'production'

export default defineConfig({
  // 修改原因：当前头像资源存放在根目录 static/avators，指定为 publicDir 后才能通过 /avators/* 正常访问。
  // ⚠️ 不确定因素：若未来新增同名 public 目录并希望继续默认行为，需要同步调整此配置。
  publicDir: 'static',
  plugins: [
    react(),
    tailwindcss(),
    ...(isProduction
      ? [
          VitePWA({
            registerType: 'autoUpdate',
            // 修改原因：仓库当前仅存在 static/favicon.ico，移除不存在的资源引用，避免构建期和运行期找不到资源。
            includeAssets: ['favicon.ico'],
            manifest: {
              name: '知识星球问答小程序',
              short_name: '知否',
              description: '初中知识问答平台',
              // 修改原因：显式声明 standalone，确保安装后按独立应用窗口启动。
              display: 'standalone',
              // 修改原因：补充 start_url，避免不同宿主环境下安装入口默认值不一致。
              start_url: '/',
              // 修改原因：补充背景色，降低启动白屏时的视觉跳变。
              background_color: '#ffffff',
              theme_color: '#ffffff',
              icons: [
                {
                  // 修改原因：当前项目未提供 192/512 PNG 图标，先复用已存在的 favicon 以保证 PWA 可构建可安装。
                  // ⚠️ 不确定因素：favicon 分辨率较低，移动端安装图标清晰度可能不足；后续拿到品牌图后应替换为 192/512 PNG。
                  src: 'favicon.ico',
                  sizes: '64x64 32x32 24x24 16x16',
                  type: 'image/x-icon'
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
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/static': {
        // @reason: 后端静态资源（音频/图片）也从 4000 端口提供
        target: 'http://localhost:3000',
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
