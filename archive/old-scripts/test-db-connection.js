// Simple database connection test
import { config } from 'dotenv'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { PrismaClient } from '@prisma/client'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env.local
config({ path: resolve(__dirname, '.env.local') })

console.log('🔍 Testing database connection...')
console.log('DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...')
console.log('DIRECT_URL:', process.env.DIRECT_URL?.substring(0, 50) + '...')
console.log('')

const prisma = new PrismaClient()

async function testConnection() {
  try {
    console.log('Attempting to connect...')
    await prisma.$connect()
    console.log('✅ Connected successfully!')
    
    console.log('\nTesting simple query...')
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Query successful:', result)
    
    console.log('\nChecking if tables exist...')
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `
    console.log('✅ Tables found:', tables)
    
  } catch (error) {
    console.error('❌ Connection failed:')
    console.error(error.message)
    console.error('\nPossible issues:')
    console.error('1. Supabase project does not exist')
    console.error('2. Database credentials are incorrect')
    console.error('3. Database has been deleted or suspended')
    console.error('4. Network/firewall blocking connection')
    console.error('\nPlease check your Supabase dashboard: https://supabase.com/dashboard')
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
