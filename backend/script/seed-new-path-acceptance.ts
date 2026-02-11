import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ADMIN = {
  phone: '11111111111',
  password: 'admin123',
  nickname: '管理员',
  role: 'teacher',
};

const PARENT = {
  phone: '13800138001',
  name: '家长-张三',
  role: 'parent',
};

const STUDENT = {
  phone: '13800138002',
  name: '学生A',
  role: 'student',
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

  const passwordHash = await bcrypt.hash(ADMIN.password, 10);
  const adminUser = await prisma.user.create({
    data: {
      phone: ADMIN.phone,
      nickname: ADMIN.nickname,
      role: ADMIN.role,
      passwordHash,
      isActive: true,
    },
  });

  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
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
        isRegistered: false,
      },
      {
        phone: STUDENT.phone,
        name: STUDENT.name,
        role: STUDENT.role,
        validUntil: thirtyDaysLater,
        isRegistered: false,
      },
    ],
  });
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
