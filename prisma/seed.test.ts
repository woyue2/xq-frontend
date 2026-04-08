import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function seed() {
  console.log('🌱 Seeding test database...')

  // Clear existing data (handle old schema tables if they exist)
  try {
    // Try to delete from old schema tables first
    await prisma.$executeRawUnsafe('DELETE FROM "ParentChild"')
    await prisma.$executeRawUnsafe('DELETE FROM "QuestionUnderstanding"')
    await prisma.$executeRawUnsafe('DELETE FROM "QuestionDimensionOption"')
    await prisma.$executeRawUnsafe('DELETE FROM "QuestionDimension"')
    await prisma.$executeRawUnsafe('DELETE FROM "AuditLog"')
    await prisma.$executeRawUnsafe('DELETE FROM "BehaviorLog"')
    await prisma.$executeRawUnsafe('DELETE FROM "Notification"')
    await prisma.$executeRawUnsafe('DELETE FROM "Favorite"')
    await prisma.$executeRawUnsafe('DELETE FROM "Like"')
    await prisma.$executeRawUnsafe('DELETE FROM "LoginLog"')
    await prisma.$executeRawUnsafe('DELETE FROM "RefreshToken"')
    await prisma.$executeRawUnsafe('DELETE FROM "UserWhitelist"')
    await prisma.$executeRawUnsafe('DELETE FROM "VerificationCode"')
    console.log('✅ Cleared old schema tables')
  } catch (error) {
    console.log('ℹ️  Old schema tables not found (this is OK)')
  }

  // Clear simplified schema data
  await prisma.comment.deleteMany()
  await prisma.answer.deleteMany()
  await prisma.question.deleteMany()
  await prisma.topic.deleteMany()
  await prisma.subject.deleteMany()
  await prisma.user.deleteMany()

  // Create test users
  const adminPassword = await bcrypt.hash('admin123', 10)

  // Admin user (can manage subjects and also post questions/answers)
  const admin = await prisma.user.create({
    data: {
      phone: '13800000001',
      nickname: '管理员老师',
      name: 'Admin Teacher',
      role: 'admin',
      passwordHash: adminPassword,
    },
  })

  console.log('✅ Created test user (Admin Teacher)')
  console.log('   Phone: 13800000001')
  console.log('   Password: admin123')
  console.log('   Role: admin (can manage subjects + post content)')

  // Create subjects
  const mathSubject = await prisma.subject.create({
    data: {
      key: 'math',
      name: '数学',
      order: 1,
      enabled: true,
      description: '数学科目',
    },
  })

  const chineseSubject = await prisma.subject.create({
    data: {
      key: 'chinese',
      name: '语文',
      order: 2,
      enabled: true,
      description: '语文科目',
    },
  })

  console.log('✅ Created subjects')

  // Create topics
  await prisma.topic.create({
    data: {
      subjectKey: 'math',
      value: 'algebra',
      label: '代数',
      order: 1,
      enabled: true,
    },
  })

  await prisma.topic.create({
    data: {
      subjectKey: 'math',
      value: 'geometry',
      label: '几何',
      order: 2,
      enabled: true,
    },
  })

  await prisma.topic.create({
    data: {
      subjectKey: 'chinese',
      value: 'reading',
      label: '阅读理解',
      order: 1,
      enabled: true,
    },
  })

  console.log('✅ Created topics')

  // Create sample questions
  const question1 = await prisma.question.create({
    data: {
      title: '如何解一元二次方程？',
      content: '请详细说明解题步骤和方法',
      subject: 'math',
      tags: ['algebra'],
      images: [],
      authorId: admin.id,
      authorName: admin.nickname,
      authorAvatar: admin.avatar,
    },
  })

  const question2 = await prisma.question.create({
    data: {
      title: '三角形面积公式',
      content: '如何计算不规则三角形的面积？',
      subject: 'math',
      tags: ['geometry'],
      images: [],
      authorId: admin.id,
      authorName: admin.nickname,
      authorAvatar: admin.avatar,
    },
  })

  console.log('✅ Created sample questions')

  // Create sample answers
  await prisma.answer.create({
    data: {
      questionId: question1.id,
      content: '一元二次方程的解法有：1. 因式分解法 2. 配方法 3. 公式法',
      images: [],
      authorId: admin.id,
      authorName: admin.nickname,
      authorAvatar: admin.avatar,
    },
  })

  console.log('✅ Created sample answers')

  // Create sample comments
  await prisma.comment.create({
    data: {
      questionId: question1.id,
      content: '这个问题很有价值',
      authorId: admin.id,
      authorName: admin.nickname,
      authorAvatar: admin.avatar,
    },
  })

  console.log('✅ Created sample comments')

  console.log('\n🎉 Test database seeded successfully!')
  console.log('\n📝 Test Account:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Phone:    13800000001')
  console.log('Password: admin123')
  console.log('Role:     admin (管理员老师)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\n✨ This account can:')
  console.log('   • Manage subjects and topics (/admin/subjects)')
  console.log('   • Create questions and answers')
  console.log('   • Post comments')
  console.log('   • View all content')
}

seed()
  .catch((error) => {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
