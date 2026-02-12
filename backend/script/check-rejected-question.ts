import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 检查已驳回问题是否存在
  const rejectedQuestion = await prisma.question.findFirst({
    where: { title: '已驳回：模糊的物理公式' }
  });

  if (rejectedQuestion) {
    console.log('✅ 已驳回问题存在:', {
      title: rejectedQuestion.title,
      status: rejectedQuestion.status,
      aiResult: rejectedQuestion.aiResult
    });
  } else {
    console.log('❌ 已驳回问题不存在，需要创建');

    // 获取学生账号
    const student1 = await prisma.user.findUnique({
      where: { phone: '13300000001' }
    });

    if (student1) {
      // 使用 upsert 确保问题存在
      const question = await prisma.question.upsert({
        where: { id: 'rejected-question-1' }, // 使用固定 ID
        create: {
          id: 'rejected-question-1',
          title: '已驳回：模糊的物理公式',
          content: '图片太黑，看不清。',
          authorId: student1.id,
          authorName: student1.nickname,
          status: 'rejected',
          aiResult: '图片不清晰，请重新拍摄上传'
        },
        update: {}
      });
      console.log('✅ 已创建驳回问题:', question.title);
    }
  }
}

main()
  .catch((e) => {
    console.error('错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
