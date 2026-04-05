/**
 * 本地开发服务器 - 代理 API 请求到 Vercel API Routes
 */
import express from 'express'
import cors from 'cors'

const app = express()
app.use(cors())
app.use(express.json())

// 动态加载 API routes
const loadRoute = async (path: string) => {
  try {
    const module = await import(path)
    return module.default
  } catch (e) {
    console.error(`Failed to load ${path}:`, e)
    return null
  }
}

// Questions API
app.get('/api/questions', async (req, res) => {
  const handler = await loadRoute('./api/questions/index.ts')
  if (handler) {
    await handler(req, res)
  } else {
    res.status(500).json({ error: 'Handler not found' })
  }
})

app.post('/api/questions', async (req, res) => {
  const handler = await loadRoute('./api/questions/index.ts')
  if (handler) {
    await handler(req, res)
  } else {
    res.status(500).json({ error: 'Handler not found' })
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Dev server running on http://localhost:${PORT}`)
})
