已经帮你写好了一个专门测试注
  册“内存降级”行为的脚本，可以
  直接用来验证生产/开发环境下
  的差异：

  - 脚本位置: backend/script/
    test-register-degrade.ts
  - 功能说明:
      - 通过修改
        process.env.NODE_ENV
        并对 prisma 做注入，统
        一模拟“数据库不可用”的
        场景。
      - 在
        NODE_ENV='production'
        下调用
        authService.register，
        预期捕获到
        AppError(500,
        'INTERNAL_SERVER_ERROR
        ', '注册服务暂不可用，
        请稍后重试')。
      - 在
        NODE_ENV='development'
        下调用同样的注册参数，
        预期调用成功并打印出内
        存用户的
        user.id（user_...）。
  - 运行方式示例（在项目根目录
    执行）:
      - cd backend
      - 使用 tsx 运行脚本：npx tsx script/test-register-degrade.ts

  脚本运行后会在控制台输出两段
  结果：

  - [PROD] 段验证“生产环境禁止
    内存降级”；
  - [DEV] 段验证“开发环境保留
    内存降级能力”