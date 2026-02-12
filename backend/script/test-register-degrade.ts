import { authService } from '../src/services/auth.service';
import { prisma } from '../src/config/database';
import { AppError } from '../src/errors/AppError';

const baseParams = {
  phone: '13800138000',
  code: '123456',
  nickname: 'DegradeTestUser'
};

const patchPrismaForRegister = () => {
  // 统一在脚本中模拟“数据库不可用”，避免实际访问数据库
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyPrisma = prisma as any;

  if (anyPrisma.verificationCode) {
    anyPrisma.verificationCode.findFirst = async () => null;
  }

  if (anyPrisma.user) {
    anyPrisma.user.findUnique = async () => null;
    anyPrisma.user.create = async () => {
      throw new Error('Simulated DB error: user.create');
    };
  }

  if (anyPrisma.userWhitelist) {
    anyPrisma.userWhitelist.findUnique = async () => null;
    anyPrisma.userWhitelist.update = async () => {
      throw new Error('Simulated DB error: userWhitelist.update');
    };
  }

  if (anyPrisma.refreshToken) {
    anyPrisma.refreshToken.create = async () => {
      throw new Error('Simulated DB error: refreshToken.create');
    };
  }
};

const runProductionCase = async () => {
  process.env.NODE_ENV = 'production';
  patchPrismaForRegister();

  // eslint-disable-next-line no-console
  console.log('=== [PROD] 注册降级策略检查 ===');

  try {
    await authService.register(baseParams);
    // eslint-disable-next-line no-console
    console.error(
      '[PROD] 意外成功：在生产环境模拟数据库异常时注册不应成功'
    );
  } catch (err) {
    if (err instanceof AppError) {
      // eslint-disable-next-line no-console
      console.log(
        '[PROD] 捕获到预期 AppError:',
        err.status,
        err.code,
        err.message
      );
    } else {
      // eslint-disable-next-line no-console
      console.error('[PROD] 捕获到非预期错误类型:', err);
    }
  }
};

const runDevelopmentCase = async () => {
  process.env.NODE_ENV = 'development';
  patchPrismaForRegister();

  // eslint-disable-next-line no-console
  console.log('=== [DEV] 注册降级策略检查 ===');

  try {
    const result = await authService.register(baseParams);
    // eslint-disable-next-line no-console
    console.log(
      '[DEV] 注册调用成功（预期保留“内存降级”能力）。',
      'user.id =',
      result.user.id
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      '[DEV] 注册调用失败：在开发环境不应因为模拟的 DB 异常而中断。',
      err
    );
  }
};

const main = async () => {
  await runProductionCase();
  // 与生产用例隔离开，再跑一次开发环境用例
  await runDevelopmentCase();

  await prisma.$disconnect();
};

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('脚本执行异常:', err);
  process.exitCode = 1;
});

