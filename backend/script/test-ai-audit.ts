/**
 * AI 审核服务测试脚本
 * 
 * 运行方式: npx tsx script/test-ai-audit.ts
 */

import { config } from 'dotenv';
config({ path: '.env' });

import { aiAuditService } from '../src/services/ai-audit.service';

async function main() {
    console.log('=== AI 审核服务测试 ===\n');

    // 检查服务是否启用
    if (!aiAuditService.isEnabled()) {
        console.error('❌ AI 审核服务未启用！请检查 AI_AUDIT_BASE_URL 和 AI_AUDIT_API_KEY 配置');
        process.exit(1);
    }

    console.log('✅ AI 审核服务已启用\n');

    // 测试用例
    const testCases = [
        {
            name: '正常数学问题',
            content: '已知三角形ABC中，角A=60°，AB=5，AC=3，求BC的长度',
            expectedSafe: true
        },
        {
            name: '模糊问题',
            content: '这道题怎么做啊',
            expectedSafe: true,
            expectSuggestion: true
        },
        {
            name: '带图片说明的问题',
            content: '如图所示，请问这道几何题怎么解？',
            expectedSafe: true
        },
        {
            name: '不当言语',
            content: '老师你真是个笨蛋',
            expectedSafe: false
        },
        {
            name: '正常的求助',
            content: '老师好，我想请教一下一元二次方程的解法，ax² + bx + c = 0，请问怎么用公式法求解？',
            expectedSafe: true
        }
    ];

    let passed = 0;
    let failed = 0;

    for (const testCase of testCases) {
        console.log(`📝 测试: ${testCase.name}`);
        console.log(`   输入: "${testCase.content.slice(0, 50)}${testCase.content.length > 50 ? '...' : ''}"`);

        try {
            const result = await aiAuditService.auditContent(testCase.content, 'question');

            console.log(`   结果: safe=${result.safe}`);
            if (result.reason) {
                console.log(`   原因: ${result.reason}`);
            }
            if (result.quality?.suggestion) {
                console.log(`   建议: ${result.quality.suggestion}`);
            }

            // 验证结果
            const safeMatch = result.safe === testCase.expectedSafe;
            const suggestionMatch = !testCase.expectSuggestion || !!result.quality?.suggestion;

            if (safeMatch && suggestionMatch) {
                console.log('   ✅ 通过\n');
                passed++;
            } else {
                console.log(`   ❌ 失败 (期望 safe=${testCase.expectedSafe})\n`);
                failed++;
            }

            // 避免请求过于频繁
            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
            console.log(`   ❌ 错误: ${error}\n`);
            failed++;
        }
    }

    console.log('=== 测试结果 ===');
    console.log(`通过: ${passed}/${testCases.length}`);
    console.log(`失败: ${failed}/${testCases.length}`);

    process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
