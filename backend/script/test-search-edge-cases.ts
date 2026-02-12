#!/usr/bin/env tsx
/**
 * 搜索功能边缘案例测试
 * 用于排查特定场景下的搜索问题
 */

import { questionService } from '../src/services/question.service';
import { prisma } from '../src/config/database';

async function testEdgeCases() {
  console.log('🧪 开始边缘案例测试...\n');

  // 测试1: 搜索特殊字符
  console.log('📌 测试 1: 特殊字符搜索');
  const specialCases = [
    '！', // 中文感叹号
    '？', // 中文问号
    '%', // SQL通配符
    '_', // SQL通配符
    "'", // 单引号
    '"', // 双引号
    '\\', // 反斜杠
    ';', // 分号
  ];

  for (const char of specialCases) {
    try {
      const result = await questionService.list({ page: 1, pageSize: 10, search: char });
      console.log(`   ✅ "${char}": ${result.list.length} 个结果`);
    } catch (err) {
      console.log(`   ❌ "${char}": ${(err as Error).message}`);
    }
  }
  console.log('');

  // 测试2: 搜索中英文混合
  console.log('📌 测试 2: 中英文混合搜索');
  const mixedCases = ['数学Math', '几何geometry', '代数algebra'];
  for (const keyword of mixedCases) {
    try {
      const result = await questionService.list({ page: 1, pageSize: 10, search: keyword });
      console.log(`   ✅ "${keyword}": ${result.list.length} 个结果`);
    } catch (err) {
      console.log(`   ❌ "${keyword}": ${(err as Error).message}`);
    }
  }
  console.log('');

  // 测试3: 搜索超长字符串
  console.log('📌 测试 3: 超长字符串（应该被限制在64字符）');
  try {
    const longString = 'a'.repeat(100);
    await questionService.list({ search: longString });
    console.log('   ❌ 应该抛出错误但没有');
  } catch (err) {
    console.log(`   ✅ 正确抛出错误: ${(err as Error).message}`);
  }
  console.log('');

  // 测试4: 搜索未审核的题目（默认不返回）
  console.log('📌 测试 4: 未审核题目搜索行为');
  const pendingQuestion = await prisma.question.findFirst({
    where: { status: 'pending' },
  });

  if (pendingQuestion) {
    const keyword = pendingQuestion.title.substring(0, 2);
    console.log(`   🔑 搜索关键词: "${keyword}" (来自未审核题目: ${pendingQuestion.title})`);

    // 搜索不带状态过滤（应该只搜索已审核的）
    const resultDefault = await questionService.list({
      page: 1,
      pageSize: 10,
      search: keyword,
    });

    // 搜索包含所有状态
    const resultAllStatus = await questionService.list({
      page: 1,
      pageSize: 10,
      search: keyword,
      status: '', // 空字符串表示不过滤状态
    });

    console.log(`   默认搜索（仅approved）: ${resultDefault.list.length} 个结果`);
    console.log(`   所有状态搜索: ${resultAllStatus.list.length} 个结果`);

    if (resultDefault.list.length === 0 && resultAllStatus.list.length > 0) {
      console.log('   ⚠️ 注意: 未审核的题目只能通过指定 status="" 找到');
    }
  } else {
    console.log('   ℹ️  数据库中没有未审核的题目，跳过测试');
  }
  console.log('');

  // 测试5: 搜索带有空格的关键词
  console.log('📌 测试 5: 带空格的关键词');
  const spacedKeywords = ['勾股 定理', '几何 辅助线'];
  for (const keyword of spacedKeywords) {
    try {
      const result = await questionService.list({ page: 1, pageSize: 10, search: keyword });
      console.log(`   ✅ "${keyword}": ${result.list.length} 个结果`);
    } catch (err) {
      console.log(`   ❌ "${keyword}": ${(err as Error).message}`);
    }
  }
  console.log('');

  // 测试6: 组合搜索（search + other filters）
  console.log('📌 测试 6: 组合搜索（search + status + tags）');
  try {
    // 搜索一个可能存在的标签
    const result = await questionService.list({
      page: 1,
      pageSize: 10,
      search: '数',
      tags: ['数学'],
      status: 'approved',
    });
    console.log(
      `   ✅ search="数" + tags=["数学"] + status="approved": ${result.list.length} 个结果`,
    );
  } catch (err) {
    console.log(`   ❌ 组合搜索失败: ${(err as Error).message}`);
  }
  console.log('');

  // 测试7: 检查实际搜索到的题目是否真的匹配
  console.log('📌 测试 7: 验证搜索结果准确性');
  const testKeyword = '几何';
  const searchResult = await questionService.list({
    page: 1,
    pageSize: 5,
    search: testKeyword,
  });

  console.log(`   🔑 搜索关键词: "${testKeyword}"`);
  console.log(`   📊 找到 ${searchResult.list.length} 个题目`);

  let mismatchCount = 0;
  for (const q of searchResult.list) {
    const matchesTitle = q.title.includes(testKeyword);
    const matchesContent = q.content ? q.content.includes(testKeyword) : false;

    if (matchesTitle || matchesContent) {
      console.log(`   ✅ ${q.title} (匹配title: ${matchesTitle}, 匹配content: ${matchesContent})`);
    } else {
      console.log(`   ❌ ${q.title} (不匹配！这是bug)`);
      mismatchCount++;
    }
  }

  if (mismatchCount === 0) {
    console.log('   ✅ 所有搜索结果都正确匹配');
  } else {
    console.log(`   ⚠️ 有 ${mismatchCount} 个搜索结果不匹配！`);
  }
  console.log('');

  // 测试8: 测试authorId + search组合
  console.log('📌 测试 8: authorId + search 组合');
  const firstAuthor = await prisma.question.findFirst({
    where: { status: 'approved' },
    orderBy: { createdAt: 'desc' },
  });

  if (firstAuthor) {
    try {
      const result = await questionService.list({
        page: 1,
        pageSize: 10,
        authorId: firstAuthor.authorId,
        search: '题',
      });
      console.log(
        `   ✅ authorId=${firstAuthor.authorId} + search="题": ${result.list.length} 个结果`,
      );
    } catch (err) {
      console.log(`   ❌ authorId + search 失败: ${(err as Error).message}`);
    }
  }
  console.log('');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ 边缘案例测试完成\n');
}

async function main() {
  try {
    await testEdgeCases();
  } catch (err) {
    console.error('❌ 测试过程中发生错误:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
