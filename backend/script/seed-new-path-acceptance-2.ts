import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ADMIN = {
  phone: '11111111111',
  password: 'admin123',
  nickname: '管理员',
  role: 'teacher' as const,
};

const PARENT = {
  phone: '13800138001',
  password: 'parent123',
  name: '家长-张三',
  nickname: '张三家长',
  role: 'parent' as const,
};

const STUDENT = {
  phone: '13800138002',
  password: 'student123',
  name: '学生A',
  nickname: '学生A',
  role: 'student' as const,
};

const TABLES = [
  'AuditLog',
  'BehaviorLog',
  'Notification',
  'Favorite',
  'Like',
  'Comment',
  'Answer',
  'QuestionUnderstanding',
  'Question',
  'QuestionDimensionOption',
  'QuestionDimension',
  'ParentChild',
  'UserWhitelist',
  'LoginLog',
  'RefreshToken',
  'VerificationCode',
  'User',
];

async function cleanDatabase() {
  const tableList = TABLES.map((name) => `"${name}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableList} CASCADE;`);
}

async function main() {
  await cleanDatabase();

  const [adminPasswordHash, parentPasswordHash, studentPasswordHash] = await Promise.all([
    bcrypt.hash(ADMIN.password, 10),
    bcrypt.hash(PARENT.password, 10),
    bcrypt.hash(STUDENT.password, 10),
  ]);

  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const adminUser = await prisma.user.create({
    data: {
      phone: ADMIN.phone,
      nickname: ADMIN.nickname,
      role: ADMIN.role,
      passwordHash: adminPasswordHash,
      isActive: true,
      isBanned: false,
    },
  });

  const parentUser = await prisma.user.create({
    data: {
      phone: PARENT.phone,
      name: PARENT.name,
      nickname: PARENT.nickname,
      role: PARENT.role,
      passwordHash: parentPasswordHash,
      isActive: true,
      isBanned: false,
      expiresAt: thirtyDaysLater,
    },
  });

  const studentUser = await prisma.user.create({
    data: {
      phone: STUDENT.phone,
      name: STUDENT.name,
      nickname: STUDENT.nickname,
      role: STUDENT.role,
      passwordHash: studentPasswordHash,
      isActive: true,
      isBanned: false,
      expiresAt: thirtyDaysLater,
    },
  });

  await prisma.userWhitelist.createMany({
    data: [
      {
        phone: ADMIN.phone,
        name: ADMIN.nickname,
        role: ADMIN.role,
        isRegistered: true,
        userId: adminUser.id,
        registeredAt: new Date(),
      },
      {
        phone: PARENT.phone,
        name: PARENT.name,
        role: PARENT.role,
        validUntil: thirtyDaysLater,
        isRegistered: true,
        userId: parentUser.id,
        registeredAt: new Date(),
      },
      {
        phone: STUDENT.phone,
        name: STUDENT.name,
        role: STUDENT.role,
        validUntil: thirtyDaysLater,
        isRegistered: true,
        userId: studentUser.id,
        registeredAt: new Date(),
      },
    ],
  });

  console.log('Seed success (new-path-acceptance-2):');
  console.log(`- 管理员: ${ADMIN.phone} / ${ADMIN.password}`);
  console.log(`- 家长: ${PARENT.phone} / ${PARENT.password}`);
  console.log(`- 学生: ${STUDENT.phone} / ${STUDENT.password}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

