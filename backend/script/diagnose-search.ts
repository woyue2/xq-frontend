#!/usr/bin/env tsx
/**
 * 搜索功能诊断脚本
 * 用于排查题目搜索功能失效的原因
 */

import { questionService } from '../src/services/question.service';
import { prisma } from '../src/config/database';

interface DiagnosticResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  details: any;
}

async function runDiagnostics() {
  console.log('🔍 开始搜索功能诊断...\n');

  const results: DiagnosticResult[] = [];

  // 1. 检查数据库中是否有测试数据
  console.log('📊 测试 1: 检查数据库数据');
  try {
    const totalQuestions = await prisma.question.count();
    const approvedQuestions = await prisma.question.count({ where: { status: 'approved' } });
    const questionsWithContent = await prisma.question.count({
      where: { NOT: { content: null } },
    });

    results.push({
      test: '数据库数据统计',
      status: 'PASS',
      details: {
        总题目数: totalQuestions,
        已审核通过题目数: approvedQuestions,
        有内容题目数: questionsWithContent,
      },
    });

    console.log(`✅ 总题目数: ${totalQuestions}`);
    console.log(`✅ 已审核通过题目数: ${approvedQuestions}`);
    console.log(`✅ 有内容题目数: ${questionsWithContent}\n`);

    if (approvedQuestions === 0) {
      console.log('⚠️ 警告: 数据库中没有已审核通过的题目，默认搜索只会返回已审核通过的题目\n');
    }
  } catch (err) {
    results.push({
      test: '数据库数据统计',
      status: 'FAIL',
      details: { error: (err as Error).message },
    });
    console.log('❌ 数据库查询失败:', (err as Error).message, '\n');
  }

  // 2. 测试基础列表查询（不带搜索）
  console.log('📋 测试 2: 基础列表查询（无搜索参数）');
  try {
    const baseResult = await questionService.list({
      page: 1,
      pageSize: 10,
    });

    results.push({
      test: '基础列表查询',
      status: 'PASS',
      details: {
        返回题目数: baseResult.list.length,
        总数: baseResult.pagination.total,
      },
    });

    console.log(`✅ 返回 ${baseResult.list.length} 个题目`);
    console.log(`✅ 总数: ${baseResult.pagination.total}\n`);

    if (baseResult.list.length > 0) {
      console.log('📝 前3个题目标题:');
      baseResult.list.slice(0, 3).forEach((q: any, i: number) => {
        console.log(`   ${i + 1}. ${q.title} (${q.status})`);
      });
      console.log('');
    }
  } catch (err) {
    results.push({
      test: '基础列表查询',
      status: 'FAIL',
      details: { error: (err as Error).message },
    });
    console.log('❌ 基础查询失败:', (err as Error).message, '\n');
  }

  // 3. 测试搜索功能 - 使用数据库中实际存在的题目标题关键词
  console.log('🔎 测试 3: 搜索功能（使用实际数据）');
  try {
    // 先获取第一个题目，用它的标题作为搜索关键词
    const firstQuestion = await prisma.question.findFirst({
      where: { status: 'approved' },
      orderBy: { createdAt: 'desc' },
    });

    if (firstQuestion) {
      // 提取标题中的第一个词（取前2个字符）作为搜索关键词
      const searchKeyword = firstQuestion.title.substring(0, 2);
      console.log(`🔑 使用搜索关键词: "${searchKeyword}" (来自题目: ${firstQuestion.title})\n`);

      const searchResult = await questionService.list({
        page: 1,
        pageSize: 10,
        search: searchKeyword,
      });

      results.push({
        test: '搜索功能',
        status: 'PASS',
        details: {
          搜索关键词: searchKeyword,
          返回题目数: searchResult.list.length,
          总数: searchResult.pagination.total,
        },
      });

      console.log(`✅ 搜索结果: ${searchResult.list.length} 个题目`);
      console.log(`✅ 总数: ${searchResult.pagination.total}\n`);

      if (searchResult.list.length > 0) {
        console.log('📝 搜索结果:');
        searchResult.list.slice(0, 3).forEach((q: any, i: number) => {
          console.log(`   ${i + 1}. ${q.title}`);
        });
        console.log('');
      } else {
        console.log('⚠️ 警告: 搜索返回0个结果\n');
      }
    } else {
      results.push({
        test: '搜索功能',
        status: 'WARNING',
        details: { reason: '数据库中没有已审核的题目' },
      });
      console.log('⚠️ 跳过: 数据库中没有已审核的题目\n');
    }
  } catch (err) {
    results.push({
      test: '搜索功能',
      status: 'FAIL',
      details: { error: (err as Error).message },
    });
    console.log('❌ 搜索失败:', (err as Error).message, '\n');
  }

  // 4. 测试搜索空白/空格
  console.log('🔎 测试 4: 搜索空白字符');
  try {
    const emptySearchResult = await questionService.list({
      page: 1,
      pageSize: 10,
      search: '   ',
    });

    results.push({
      test: '搜索空白字符',
      status: 'PASS',
      details: {
        返回题目数: emptySearchResult.list.length,
        是否同基础查询:
          emptySearchResult.list.length ===
          (await questionService.list({ page: 1, pageSize: 10 })).list.length,
      },
    });

    console.log(`✅ 空白搜索返回: ${emptySearchResult.list.length} 个题目（应该同基础查询）\n`);
  } catch (err) {
    results.push({
      test: '搜索空白字符',
      status: 'FAIL',
      details: { error: (err as Error).message },
    });
    console.log('❌ 空白搜索失败:', (err as Error).message, '\n');
  }

  // 5. 检查题目中的 null 值
  console.log('📊 测试 5: 检查题目中的 null 值分布');
  try {
    const nullContentCount = await prisma.question.count({
      where: { content: null },
    });
    const emptyContentCount = await prisma.question.count({
      where: { content: '' },
    });

    results.push({
      test: 'null 值分布检查',
      status: 'PASS',
      details: {
        content为null的题目数: nullContentCount,
        content为空字符串的题目数: emptyContentCount,
      },
    });

    console.log(`✅ content 为 null: ${nullContentCount} 个`);
    console.log(`✅ content 为空字符串: ${emptyContentCount} 个\n`);

    if (nullContentCount > 0) {
      console.log('⚠️ 注意: 数据库中有题目 content 为 null，这可能导致搜索行为异常\n');
    }
  } catch (err) {
    results.push({
      test: 'null 值分布检查',
      status: 'FAIL',
      details: { error: (err as Error).message },
    });
    console.log('❌ null 值检查失败:', (err as Error).message, '\n');
  }

  // 诊断总结
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 诊断总结\n');

  const passCount = results.filter((r) => r.status === 'PASS').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;
  const warningCount = results.filter((r) => r.status === 'WARNING').length;

  console.log(`✅ 通过: ${passCount}`);
  console.log(`❌ 失败: ${failCount}`);
  console.log(`⚠️ 警告: ${warningCount}\n`);

  // 建议修复方案
  if (failCount > 0 || warningCount > 0) {
    console.log('💡 建议修复方案:\n');

    if (results.some((r) => r.details?.content为null的题目数 > 0)) {
      console.log('1. 🔧 修复 content 字段 null 值问题:');
      console.log('   - 将搜索逻辑中的 content 字段检查改为非 null 时才搜索');
      console.log('   - 或者在数据库中将 null 值统一改为空字符串\n');
    }

    if (results.some((r) => r.details?.已审核通过题目数 === 0)) {
      console.log('2. 🔧 添加测试数据:');
      console.log('   - 创建一些已审核通过的题目用于测试\n');
    }

    if (results.some((r) => r.status === 'FAIL' && r.test === '搜索功能')) {
      console.log('3. 🔧 检查数据库连接和 Prisma 配置:');
      console.log('   - 确保 DATABASE_URL 正确配置');
      console.log('   - 运行 npx prisma db push 同步数据库结构\n');
    }
  } else {
    console.log('✅ 所有测试通过！搜索功能工作正常。\n');
  }

  return results;
}

async function main() {
  try {
    await runDiagnostics();
  } catch (err) {
    console.error('❌ 诊断过程中发生错误:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
