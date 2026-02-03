/**
 * AI 审核回调测试脚本
 * 
 * 用途：验证 AI 审核回调接口 /api/internal/ai-check 是否正常工作
 * 
 * 运行方式：
 *   npx tsx script/test-ai-callback.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../src/config/database';

// 加载项目根目录的 .env 文件
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testAiCallback() {
    console.log('🚀 开始测试 AI 审核回调集成...\n');

    // 1. 检查环境变量
    console.log('📋 环境变量检查:');
    console.log(`  AI_AUDIT_BASE_URL: ${process.env.AI_AUDIT_BASE_URL || '❌ 未配置'}`);
    console.log(`  AI_INTERNAL_TOKEN: ${process.env.AI_INTERNAL_TOKEN ? '✅ 已设置' : '❌ 未配置'}`);
    console.log(`  AI_AUDIT_PROVIDER_NAME: ${process.env.AI_AUDIT_PROVIDER_NAME || '(未设置，使用默认值)'}\n`);

    if (!process.env.AI_INTERNAL_TOKEN) {
        console.log('⚠️  警告: AI_INTERNAL_TOKEN 未配置，回调接口将不做鉴权校验\n');
    }

    // 2. 创建测试数据
    console.log('📝 创建测试问题...');
    const testQuestion = await prisma.question.create({
        data: {
            title: 'AI测试问题',
            content: '这是一个用于测试AI审核回调的问题',
            authorId: 'test-user-001',
            authorName: 'AI测试用户',
            status: 'pending',
            aiResult: '待AI审核',
            subject: '数学',
            tags: [],
            likes: 0,
            favorites: 0,
            answers: 0,
            comments: 0
        }
    });

    console.log(`  ✅ 创建成功，问题ID: ${testQuestion.id}\n`);

    // 3. 模拟 AI 回调
    console.log('🤖 模拟 AI 审核回调...');

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const callbackUrl = `${backendUrl}/api/internal/ai-check`;

    console.log(`  回调地址: ${callbackUrl}`);

    const payload = {
        targetType: 'question',
        targetId: testQuestion.id,
        result: {
            safe: true,
            score: 92,
            reason: '内容积极向上，适合学生讨论',
            provider: process.env.AI_AUDIT_PROVIDER_NAME || 'test-script'
        }
    };

    console.log(`  请求体:`, JSON.stringify(payload, null, 2), '\n');

    try {
        const response = await fetch(callbackUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(process.env.AI_INTERNAL_TOKEN ? { 'X-Internal-Token': process.env.AI_INTERNAL_TOKEN } : {})
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            console.log('  ✅ 回调成功!');
            console.log(`  响应状态: ${response.status}`);
            console.log(`  响应数据:`, JSON.stringify(data, null, 2), '\n');
        } else {
            console.log('  ❌ 回调失败!');
            console.log(`  响应状态: ${response.status}`);
            console.log(`  错误信息:`, JSON.stringify(data, null, 2), '\n');
        }
    } catch (error) {
        console.log('  ❌ 请求失败:', error instanceof Error ? error.message : error, '\n');
    }

    // 4. 验证数据库更新
    console.log('🔍 验证数据库状态...');
    const updated = await prisma.question.findUnique({
        where: { id: testQuestion.id }
    });

    if (updated) {
        console.log(`  状态: ${updated.status}`);
        console.log(`  AI结果: ${updated.aiResult}`);
        console.log(`  评分: ${updated.score}\n`);

        if (updated.status === 'approved') {
            console.log('✅ 测试成功! AI 审核回调已正常工作\n');
        } else {
            console.log('⚠️  状态未更新为 approved，请检查回调逻辑\n');
        }
    }

    // 5. 清理测试数据
    console.log('🧹 清理测试数据...');
    await prisma.question.delete({
        where: { id: testQuestion.id }
    });
    console.log('  ✅ 清理完成\n');

    // 6. 测试 rejected 场景
    console.log('🔴 测试审核不通过场景...');
    const rejectQuestion = await prisma.question.create({
        data: {
            title: 'AI测试-拒绝场景',
            content: '包含敏感词汇的测试内容',
            authorId: 'test-user-001',
            authorName: 'AI测试用户',
            status: 'pending',
            aiResult: '待AI审核',
            subject: '数学',
            tags: [],
            likes: 0,
            favorites: 0,
            answers: 0,
            comments: 0
        }
    });

    const rejectPayload = {
        targetType: 'question',
        targetId: rejectQuestion.id,
        result: {
            safe: false,
            score: 15,
            reason: '内容包含不当言论'
        }
    };

    try {
        const response = await fetch(callbackUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(process.env.AI_INTERNAL_TOKEN ? { 'X-Internal-Token': process.env.AI_INTERNAL_TOKEN } : {})
            },
            body: JSON.stringify(rejectPayload)
        });

        if (response.ok) {
            const rejected = await prisma.question.findUnique({
                where: { id: rejectQuestion.id }
            });

            if (rejected?.status === 'rejected') {
                console.log('  ✅ 拒绝场景测试成功\n');
            } else {
                console.log('  ⚠️  状态未更新为 rejected\n');
            }
        }
    } catch (error) {
        console.log('  ❌ 拒绝场景测试失败:', error instanceof Error ? error.message : error, '\n');
    }

    await prisma.question.delete({
        where: { id: rejectQuestion.id }
    });

    console.log('✨ 全部测试完成!\n');

    console.log('📌 注意事项:');
    console.log('  1. AI_AUDIT_PROVIDER_NAME 仅用于标识，不影响回调处理逻辑');
    console.log('  2. 确保后端服务正在运行 (npm run dev)');
    console.log('  3. 实际使用时，需要外部 AI 服务主动调用回调接口');
    console.log('  4. result.safe=true → approved, result.safe=false → rejected\n');
}

testAiCallback()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
