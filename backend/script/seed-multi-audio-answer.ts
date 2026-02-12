import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. 准备一个老师用户
  const teacher = await prisma.user.upsert({
    where: { phone: '13900009999' },
    update: {
      role: 'teacher',
      nickname: '多段音频测试老师',
      isActive: true,
      isBanned: false
    },
    create: {
      id: 'teacher_multi_audio_001',
      phone: '13900009999',
      nickname: '多段音频测试老师',
      role: 'teacher',
      isActive: true,
      isBanned: false
    }
  });

  // 2. 准备一个测试问题
  const question = await prisma.question.upsert({
    where: { id: 'q-multi-audio-001' },
    update: {},
    create: {
      id: 'q-multi-audio-001',
      title: '多段音频回答测试问题',
      content: '用于验证一个回答中包含多段音频 URL 的场景。',
      subject: 'math',
      tags: ['多段音频', '测试'],
      difficulty: 'medium',
      status: 'approved',
      isGoodQuestion: false,
      isPinned: false,
      score: null,
      aiResult: '无违规',
      likes: 0,
      favorites: 0,
      comments: 0,
      answers: 0,
      authorId: teacher.id,
      authorName: teacher.nickname,
      authorAvatar: teacher.avatar ?? null
    }
  });

  // 3. 多段音频 URL（直接使用你提供的本地路径作为测试数据）
  const audioUrls = [
    "/mnt/c/Users/Administrator/Downloads/知识星球问答小程序 4/backend/static/audio/test-audio2.mp3",
    "/mnt/c/Users/Administrator/Downloads/知识星球问答小程序 4/backend/static/audio/test-audio.mp3"
  ];

  // 将多段音频以 JSON 数组形式存入 audioUrl 字段，后续前端可按数组解析使用
  const createdAnswer = await prisma.answer.create({
    data: {
      questionId: question.id,
      content: '这是一个包含多段语音的测试回答（audioUrl 中存的是 JSON 数组）。',
      images: [],
      audioUrl: JSON.stringify(audioUrls),
      authorId: teacher.id,
      authorName: teacher.nickname,
      authorAvatar: teacher.avatar ?? null,
      likes: 0,
      status: 'approved',
      aiResult: '无违规'
    }
  });

  // 顺带更新问题的回答数量
  await prisma.question.update({
    where: { id: question.id },
    data: {
      answers: {
        increment: 1
      }
    }
  });

  // eslint-disable-next-line no-console
  console.log('Seeded multi-audio answer:', {
    questionId: question.id,
    answerId: createdAnswer.id,
    audioUrlRaw: createdAnswer.audioUrl
  });
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

