/**
 * 检查数据库中是否包含指定关键词的题目
 *
 * 用途：快速诊断搜索功能问题时使用
 *
 * 使用方法：
 * npx tsx script/check-search-data.ts "关键词"
 * npx tsx script/check-search-data.ts "勾股定理"
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSearchData(keyword: string) {
  console.log('\n========================================');
  console.log(`🔍 搜索关键词: "${keyword}"`);
  console.log('========================================\n');

  try {
    // 1. 检查所有包含关键词的题目（不限制状态）
    console.log('1️⃣  所有匹配的题目（不限制状态）');
    console.log('----------------------------------------');
    const allMatches = await prisma.question.findMany({
      where: {
        OR: [
          {
            title: {
              contains: keyword,
              mode: 'insensitive',
            },
          },
          {
            content: {
              contains: keyword,
              mode: 'insensitive',
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        status: true,
        difficulty: true,
        subject: true,
        createdAt: true,
      },
    });

    console.log(`找到 ${allMatches.length} 个匹配的题目\n`);

    if (allMatches.length > 0) {
      console.log('题目列表：');
      allMatches.forEach((q, index) => {
        console.log(`  ${index + 1}. [${q.status}] ${q.title}`);
        console.log(`     ID: ${q.id}, 难度: ${q.difficulty}, 科目: ${q.subject}`);
        console.log(`     创建时间: ${q.createdAt.toISOString()}\n`);
      });
    } else {
      console.log('⚠️  警告：数据库中没有包含该关键词的题目！');
      console.log('   建议：\n');
      console.log('   1. 确认搜索关键词是否正确');
      console.log('   2. 检查题目是否包含该关键词');
      console.log('   3. 确认题目状态（未审核的题目不会出现在搜索结果中）\n');
    }

    // 2. 检查已审核通过的题目（默认搜索范围）
    console.log('\n2️⃣  已审核通过的题目（默认搜索范围）');
    console.log('----------------------------------------');
    const approvedMatches = allMatches.filter((q) => q.status === 'approved');
    console.log(`找到 ${approvedMatches.length} 个已审核的题目\n`);

    if (approvedMatches.length > 0) {
      console.log('已审核题目列表：');
      approvedMatches.forEach((q, index) => {
        console.log(`  ${index + 1}. ${q.title}`);
        console.log(`     ID: ${q.id}\n`);
      });
    } else if (allMatches.length > 0) {
      console.log('⚠️  警告：找到了匹配的题目，但都不是已审核状态！');
      console.log('   这就是为什么搜索结果为空的原因。\n');
      console.log('   解决方案：\n');
      console.log('   1. 审核这些题目：');
      allMatches.forEach((q, index) => {
        console.log(`      - 题目ID: ${q.id} (${q.title})`);
      });
      console.log('\n   2. 或者修改前端调用，搜索所有状态的题目：');
      console.log(`      GET /api/questions?search=${encodeURIComponent(keyword)}&status=\n`);
    } else {
      console.log('✓ 没有已审核的匹配题目（符合预期）\n');
    }

    // 3. 统计数据库状态分布
    console.log('\n3️⃣  数据库状态统计');
    console.log('----------------------------------------');
    const stats = await prisma.question.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    console.log('题目状态分布：');
    stats.forEach((stat) => {
      console.log(`  - ${stat.status}: ${stat._count.id} 个`);
    });

    // 4. 给出具体建议
    console.log('\n4️⃣  诊断建议');
    console.log('----------------------------------------');

    if (allMatches.length === 0) {
      console.log('❌ 问题：数据库中没有包含该关键词的题目');
      console.log('\n   解决方案：');
      console.log('   1. 确认搜索关键词是否正确（检查拼写、空格等）');
      console.log('   2. 添加包含该关键词的测试数据');
      console.log('   3. 使用其他已知存在的关键词进行测试\n');
    } else if (approvedMatches.length === 0) {
      console.log('❌ 问题：找到了匹配的题目，但都不是已审核状态');
      console.log('\n   当前行为是正常的：后端默认只搜索已审核的题目\n');
      console.log('   解决方案：');
      console.log('   1. 审核这些题目');
      console.log('   2. 或者使用以下URL搜索所有状态的题目：');
      console.log(`      http://localhost:5173/?search=${encodeURIComponent(keyword)}&status=\n`);
    } else {
      console.log('✅ 数据库中有已审核的匹配题目');
      console.log(`\n   预期行为：搜索 "${keyword}" 应该返回 ${approvedMatches.length} 个题目`);
      console.log('\n   如果前端搜索结果仍为空，请检查：');
      console.log('   1. 浏览器URL是否包含正确的search参数');
      console.log('   2. 浏览器开发者工具Network标签中的请求/响应');
      console.log('   3. 后端控制台是否有错误日志');
      console.log('   4. 后端服务是否重启（确保使用最新代码）\n');
    }

    // 5. 测试API调用
    console.log('5️⃣  测试API调用（后端直接调用）');
    console.log('----------------------------------------');

    const testUrl = `http://localhost:3000/api/questions?search=${encodeURIComponent(keyword)}&page=1&pageSize=10`;
    console.log(`使用 curl 测试：\n`);
    console.log(`curl "${testUrl}"\n`);

    console.log('或使用以下代码测试：\n');
    console.log(`fetch("${testUrl}")`);
    console.log(`  .then(res => res.json())`);
    console.log(`  .then(data => console.log(data));\n`);

    console.log('========================================');
    console.log('✓ 诊断完成');
    console.log('========================================\n');
  } catch (error) {
    console.error('❌ 诊断失败：', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 获取命令行参数
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('❌ 错误：请提供搜索关键词\n');
  console.log('使用方法：');
  console.log('  npx tsx script/check-search-data.ts "关键词"\n');
  console.log('示例：');
  console.log('  npx tsx script/check-search-data.ts "勾股定理"');
  console.log('  npx tsx script/check-search-data.ts "几何"');
  console.log('  npx tsx script/check-search-data.ts "test"\n');
  process.exit(1);
}

const keyword = args[0];

// 执行诊断
checkSearchData(keyword).catch((error) => {
  console.error('\n💥 诊断过程中发生错误：');
  console.error(error);
  process.exit(1);
});
