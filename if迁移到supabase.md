需要改动的内容
文件	改动
backend/.env（服务器上的）	改 DATABASE_URL 值
代码层面：零改动。

原因：


database.ts
 里的 new PrismaClient() 会自动读取环境变量 DATABASE_URL，没有任何硬编码
Prisma Schema 不需要动，表结构不变
所有业务代码、路由、middleware 完全不碰
完整迁移步骤（给你备查）
bash
# 1. 在服务器上修改 .env
DATABASE_URL="postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"
# Supabase 还推荐用连接池地址（6543端口）：
DATABASE_URL="postgresql://postgres:[password]@db.[project].supabase.co:6543/postgres?pgbouncer=true"
# Prisma 迁移用直连（5432）：
DIRECT_URL="postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"
# 2. 把旧数据库数据导出（在旧服务器）
pg_dump -U postgres your_db > backup.sql
# 3. 把 Schema 推到 Supabase
npx prisma migrate deploy
# 4. 导入历史数据
psql $DATABASE_URL < backup.sql
# 5. 重启后端
pm2 restart your-app
注意：如果你用 Prisma 连接池功能，schema.prisma 里要加一行 directUrl = env("DIRECT_URL")，不过这是可选优化，不做也能跑。