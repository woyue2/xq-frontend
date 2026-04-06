import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const phone = '11111111111';
  const nickname = '管理员老师';
  const role = 'admin';
  const plainPassword = 'pXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5cWxtb3Z0Zmtmd21rbGZwdm5jIiwicm9sZSI6InNlcnZpY2Vf';

  const passwordHash = await bcrypt.hash(plainPassword, 10);

  const user = await prisma.user.upsert({
    where: { phone },
    update: {
      nickname,
      role,
      isActive: true,
      isBanned: false,
      passwordHash
    },
    create: {
      phone,
      nickname,
      role,
      isActive: true,
      isBanned: false,
      passwordHash
    }
  });

  // eslint-disable-next-line no-console
  console.log('Seeded admin teacher user:', {
    id: user.id,
    phone: user.phone,
    role: user.role
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

