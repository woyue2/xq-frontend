import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 初始化 method 维度
  const dimensionKey = 'method';

  const dimension = await prisma.questionDimension.upsert({
    where: { key: dimensionKey },
    update: {},
    create: {
      key: dimensionKey,
      name: '解题方法',
      enabled: true,
      multiSelect: false,
      order: 0,
      description: '用于描述本题采用的主要解题方法或办法',
    },
  });

  const existingOptions = await prisma.questionDimensionOption.findMany({
    where: { dimensionKey },
  });

  if (existingOptions.length === 0) {
    await prisma.questionDimensionOption.createMany({
      data: [
        {
          dimensionKey,
          value: '配方法',
          label: '配方法',
          order: 10,
          enabled: true,
        },
        {
          dimensionKey,
          value: '公式法',
          label: '公式法',
          order: 20,
          enabled: true,
        },
        {
          dimensionKey,
          value: '因式分解法',
          label: '因式分解法',
          order: 30,
          enabled: true,
        },
        {
          dimensionKey,
          value: 'graph',
          label: '数形结合',
          order: 40,
          enabled: true,
        },
        {
          dimensionKey,
          value: 'unknown',
          label: '暂不确定',
          order: 999,
          enabled: true,
        },
      ],
    });
  }

  // 确保 unknown 选项存在且在底部
  const unknownOption = await prisma.questionDimensionOption.findFirst({
    where: { dimensionKey, value: 'unknown' },
  });

  if (unknownOption) {
    await prisma.questionDimensionOption.update({
      where: { id: unknownOption.id },
      data: {
        label: '暂不确定',
        enabled: true,
        order: 999,
      },
    });
  } else {
    await prisma.questionDimensionOption.create({
      data: {
        dimensionKey,
        value: 'unknown',
        label: '暂不确定',
        order: 999,
        enabled: true,
      },
    });
  }

  console.log('Seeded question dimensions for method.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
