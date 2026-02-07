先打开docker desktop
然后 docker-compose up -d
才链接上数据库
查看数据库数据的方法
1️⃣ Prisma Studio（推荐，最简单）
在 backend 目录下运行：
cd backend
npx prisma studio
这会打开一个浏览器 GUI，可以直观地查看和编辑所有数据。
2️⃣ 命令行直接查询
使用 psql 连接数据库：
psql postgresql://kpqa:kpqa_password@localhost:5432/kpqa_db
或者在 backend 目录运行：
cd backend
npx prisma db push  # 同步 schema
npx prisma db seed  # 初始化种子数据
3️⃣ Docker 环境查看
如果你用 docker-compose 启动的：
docker exec -it <postgres_container_name> psql -U kpqa -d kpqa_db
4️⃣ 查看现有数据表
数据库包含以下表：
- User - 用户表（手机号、昵称、角色）
- Question - 问题表
- Answer - 回答表
- Comment - 评论表
- UserWhitelist - 白名单
- VerificationCode - 验证码记录
- LoginLog - 登录日志
- QuestionDimension - 题目维度
5️⃣ 快速查看命令
# 查看所有用户
psql postgresql://kpqa:kpqa_password@localhost:5432/kpqa_db -c "SELECT * FROM \"User\";"
# 查看所有问题
psql postgresql://kpqa:kpqa_password@localhost:5432/kpqa_db -c "SELECT * FROM \"Question\";"
# 查看表结构
psql postgresql://kpqa:kpqa_password@localhost:5432/kpqa_db -c "\d \"Question\""
建议用 Prisma Studio，最直观方便！