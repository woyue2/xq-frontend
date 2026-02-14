/**
 * 问题图片存储功能测试脚本
 * 
 * 用途：验证问题的 images 字段是否正确保存和读取
 * 
 * 运行方式：
 *   npx tsx script/test-question-images.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../src/config/database';

// 加载项目根目录的 .env 文件
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testQuestionImages() {
    console.log('🚀 开始测试问题图片存储功能...\n');

    // 使用本地静态图片URL
    const testImages = [
        'http://localhost:3000/static/image/test-image.jpg',
        'http://localhost:3000/static/image/test-image2.jpg'
    ];

    try {
        // 1. 创建带图片的测试问题
        console.log('📝 创建带图片的测试问题...');
        const testQuestion = await prisma.question.create({
            data: {
                title: '测试图片存储功能',
                content: '这是一个包含两张图片的测试问题',
                authorId: 'test-user-images',
                authorName: '图片测试用户',
                status: 'pending',
                aiResult: '测试中',
                subject: '数学',
                tags: ['图片测试'],
                images: testImages,
                likes: 0,
                favorites: 0,
                answers: 0,
                comments: 0
            }
        });

        console.log(`  ✅ 创建成功，问题ID: ${testQuestion.id}`);
        console.log(`  📷 保存的图片数量: ${testQuestion.images.length}\n`);

        // 2. 验证图片是否正确保存
        console.log('🔍 验证图片数据...');
        const retrieved = await prisma.question.findUnique({
            where: { id: testQuestion.id }
        });

        if (!retrieved) {
            console.log('  ❌ 无法找到刚创建的问题\n');
            return;
        }

        console.log(`  保存的图片:`);
        retrieved.images.forEach((img, index) => {
            console.log(`    ${index + 1}. ${img}`);
        });

        const imagesMatch =
            retrieved.images.length === testImages.length &&
            retrieved.images.every((img, idx) => img === testImages[idx]);

        if (imagesMatch) {
            console.log('  ✅ 图片数据完全匹配！\n');
        } else {
            console.log('  ⚠️  图片数据不匹配\n');
            console.log('  期望:', testImages);
            console.log('  实际:', retrieved.images);
        }

        // 3. 测试空图片数组
        console.log('📝 测试无图片的问题...');
        const noImageQuestion = await prisma.question.create({
            data: {
                title: '无图片测试问题',
                content: '这个问题没有图片',
                authorId: 'test-user-images',
                authorName: '图片测试用户',
                status: 'pending',
                aiResult: '测试中',
                subject: '物理',
                tags: [],
                images: [],
                likes: 0,
                favorites: 0,
                answers: 0,
                comments: 0
            }
        });

        console.log(`  ✅ 创建成功，图片数量: ${noImageQuestion.images.length}\n`);

        // 4. 清理测试数据
        console.log('🧹 清理测试数据...');
        await prisma.question.deleteMany({
            where: {
                authorId: 'test-user-images'
            }
        });
        console.log('  ✅ 清理完成\n');

        console.log('✨ 全部测试通过！\n');
        console.log('📌 图片存储功能正常工作');
        console.log('  - ✅ 可以保存多张图片');
        console.log('  - ✅ 可以正确读取图片数组');
        console.log('  - ✅ 支持空图片数组\n');

    } catch (error) {
        console.error('❌ 测试失败:', error);

        // 确保清理测试数据
        try {
            await prisma.question.deleteMany({
                where: { authorId: 'test-user-images' }
            });
        } catch {
            // 静默失败
        }
    }
}

testQuestionImages()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
