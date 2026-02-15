import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // 修改原因：当前头像资源存放在根目录 static/avators，指定为 publicDir 后才能通过 /avators/* 正常访问。
  // ⚠️ 不确定因素：若未来新增同名 public 目录并希望继续默认行为，需要同步调整此配置。
  publicDir: 'static',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // 修改原因：你要求“全部开启”，开发环境也启用 PWA。
      devOptions: {
        enabled: true
      },
      // 修改原因：仅纳入规范图标资产，避免异常 favicon.ico 参与安装图标决策。
      includeAssets: [
        'favicon-32.png',
        'apple-touch-icon.png',
        'pwa-192.png',
        'pwa-512.png',
        'pwa-maskable-192.png',
        'pwa-maskable-512.png'
      ],
      manifest: {
        name: '题题高',
        short_name: '题题高',
        description: '初中知识问答平台',
        // 修改原因：显式声明 standalone，确保安装后按独立应用窗口启动。
        display: 'standalone',
        // 修改原因：补充 start_url，避免不同宿主环境下安装入口默认值不一致。
        start_url: '/',
        // 修改原因：设置稳定 id，减少不同入口安装时被识别为不同应用。
        id: '/',
        // 修改原因：补充背景色，降低启动白屏时的视觉跳变。
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
          {
            // 修改原因：补齐 192x192 PNG 图标，满足主流浏览器 PWA 安装校验要求。
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            // 修改原因：补齐 512x512 PNG 图标，满足主流浏览器 PWA 安装校验要求。
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            // 修改原因：为 Android 等平台提供 maskable 图标，避免圆角裁切损坏主体。
            src: 'pwa-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            // 修改原因：提供高分辨率 maskable 图标，适配高密度设备安装图标渲染。
            src: 'pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
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
