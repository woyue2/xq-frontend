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

const STUDENT_A = {
  phone: '13800138002',
  password: 'student123',
  name: '学生A',
  nickname: '搜索同学A',
  role: 'student' as const,
};

const STUDENT_B = {
  phone: '13800138003',
  password: 'studentB123',
  name: '学生B',
  nickname: '搜索同学B',
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

  const [adminPasswordHash, parentPasswordHash, studentAPasswordHash, studentBPasswordHash] =
    await Promise.all([
      bcrypt.hash(ADMIN.password, 10),
      bcrypt.hash(PARENT.password, 10),
      bcrypt.hash(STUDENT_A.password, 10),
      bcrypt.hash(STUDENT_B.password, 10),
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

  const studentAUser = await prisma.user.create({
    data: {
      phone: STUDENT_A.phone,
      name: STUDENT_A.name,
      nickname: STUDENT_A.nickname,
      role: STUDENT_A.role,
      passwordHash: studentAPasswordHash,
      isActive: true,
      isBanned: false,
      expiresAt: thirtyDaysLater,
    },
  });

  const studentBUser = await prisma.user.create({
    data: {
      phone: STUDENT_B.phone,
      name: STUDENT_B.name,
      nickname: STUDENT_B.nickname,
      role: STUDENT_B.role,
      passwordHash: studentBPasswordHash,
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
        phone: STUDENT_A.phone,
        name: STUDENT_A.name,
        role: STUDENT_A.role,
        validUntil: thirtyDaysLater,
        isRegistered: true,
        userId: studentAUser.id,
        registeredAt: new Date(),
      },
      {
        phone: STUDENT_B.phone,
        name: STUDENT_B.name,
        role: STUDENT_B.role,
        validUntil: thirtyDaysLater,
        isRegistered: true,
        userId: studentBUser.id,
        registeredAt: new Date(),
      },
    ],
  });

  await prisma.parentChild.create({
    data: {
      parentId: parentUser.id,
      childId: studentAUser.id,
    },
  });

  const now = Date.now();
  const fourteenMinutesAgo = new Date(now - 14 * 60 * 1000);
  const twentyMinutesAgo = new Date(now - 20 * 60 * 1000);

  await prisma.question.createMany({
    data: [
      {
        id: 'q-search-1',
        title: '勾股定理基础练习',
        content: '这是一道关于勾股定理的入门题',
        subject: 'math',
        tags: ['勾股定理'],
        difficulty: 'easy',
        status: 'approved',
        isGoodQuestion: false,
        isPinned: false,
        likes: 0,
        favorites: 0,
        comments: 0,
        answers: 0,
        authorId: studentAUser.id,
        authorName: STUDENT_A.nickname,
        images: [],
        createdAt: twentyMinutesAgo,
      },
      {
        id: 'q-search-2',
        title: '相似三角形综合题',
        content: '与勾股定理无关的题目内容',
        subject: 'math',
        tags: ['相似三角形'],
        difficulty: 'medium',
        status: 'approved',
        isGoodQuestion: false,
        isPinned: false,
        likes: 0,
        favorites: 0,
        comments: 0,
        answers: 0,
        authorId: studentBUser.id,
        authorName: STUDENT_B.nickname,
        images: [],
        createdAt: fourteenMinutesAgo,
      },
    ],
  });

  console.log('Seed success (new-path-acceptance-3):');
  console.log(`- 管理员: ${ADMIN.phone} / ${ADMIN.password}`);
  console.log(`- 家长: ${PARENT.phone} / ${PARENT.password}`);
  console.log(`- 学生A: ${STUDENT_A.phone} / ${STUDENT_A.password}`);
  console.log(`- 学生B: ${STUDENT_B.phone} / ${STUDENT_B.password}`);
  console.log('- 已写入搜索样例题: 相似三角形综合题（math/medium/搜索同学B）');
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
