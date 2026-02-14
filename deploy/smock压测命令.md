  可以给你一条“带教师 token 的完整命令”，而且不需要你手动往数
  据库写教师账号——当前鉴权只看 JWT 里的 role: 'teacher'，不会
  去查用户表，所以可以用一个专门给压测用的虚拟 teacher 用户。

  下面是本地一条直接可用的一行命令（假设后端已在本地 http://
  localhost:3000 跑起来）：

  BACKEND_URL=http://localhost:3000 \
  BACKEND_SMOKE_TEACHER_TOKEN=$(cd backend && node -e
  "require('dotenv').config(); const
  jwt=require('jsonwebtoken'); const token=jwt.sign({ sub:
  'perf_teacher_001', role: 'teacher', type: 'access' },
  process.env.JWT_SECRET, { expiresIn: '1h' });
  console.log(token);") \
  ./scripts/perf-smoke.sh


  不需要开启前端，只要后端在跑就可以。

  最小步骤是：

  1. 在 backend 目录启动后端（确保端口是 4000，比如）：

     cd backend
     npm run dev
  2. 在项目根目录（有 scripts/perf-smoke.sh 的地方）开一个新
     终端，直接跑这条命令：

     BACKEND_URL=http://localhost:3000 \
     BACKEND_SMOKE_TEACHER_TOKEN=$(cd backend && node -e
  "require('dotenv').config(); const
  jwt=require('jsonwebtoken'); const token=jwt.sign({ sub:
  'perf_teacher_001', role: 'teacher', type: 'access' },
  process.env.JWT_SECRET, { expiresIn: '1h' });
  console.log(token);") \
     ./scripts/perf-smoke.sh

     
  说明：

  - 这条命令会在 backend/.env 中读取 JWT_SECRET，用 Node 动态
    生成一个 role: 'teacher' 的访问 token，赋值给
    BACKEND_SMOKE_TEACHER_TOKEN，然后执行 scripts/perf-
    smoke.sh。
  - 不需要数据库里存在 perf_teacher_001 这个用户，审核接口只
    会把 sub 写进 auditLog.auditorId，不做用户表校验，所以不
    会出错。