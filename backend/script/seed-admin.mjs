import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const STEP_TIMEOUT_MS = 30_000;

const withTimeout = async (label, runner, timeoutMs = STEP_TIMEOUT_MS) => {
  let timeoutId;
  try {
    return await Promise.race([
      runner(),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`[seed-admin] step timeout: ${label} (${timeoutMs}ms)`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const logStep = (message) => {
  // 修改原因：补充步骤日志，避免执行卡住时无上下文信息。
  // eslint-disable-next-line no-console
  console.log(`[seed-admin] ${message}`);
};

async function main() {
  const phone = '11111111111';
  const nickname = '管理员老师';
  const role = 'teacher';
  const plainPassword = '87654321';

  logStep('start');
  const passwordHash = await withTimeout('hash password', () => bcrypt.hash(plainPassword, 10));
  logStep('password hashed');

  const user = await withTimeout('upsert admin user', () =>
    prisma.user.upsert({
      where: { phone },
      update: {
        nickname,
        role,
        isActive: true,
        isBanned: false,
        passwordHash,
      },
      create: {
        phone,
        nickname,
        role,
        isActive: true,
        isBanned: false,
        passwordHash,
      },
    })
  );

  // eslint-disable-next-line no-console
  console.log('Seeded admin teacher user:', {
    id: user.id,
    phone: user.phone,
    role: user.role,
  });
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Seed admin failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
