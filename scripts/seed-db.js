// Load environment variables from .env.local
import { config } from 'dotenv'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { spawn } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env.local
config({ path: resolve(__dirname, '../.env.local') })

// Run the seed script
const seedProcess = spawn('npx', ['tsx', 'prisma/seed.test.ts'], {
  stdio: 'inherit',
  shell: true,
  env: process.env
})

seedProcess.on('close', (code) => {
  process.exit(code)
})
