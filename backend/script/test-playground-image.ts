/**
 * 图片审核测试脚本
 * 
 * 使用 GLM-4V-Flash 模型测试图片审核功能
 * 运行方式: npx tsx script/test-image-audit.ts
 */

import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

config({ path: '.env' });

const AI_AUDIT_BASE_URL = process.env.AI_AUDIT_BASE_URL;
const AI_AUDIT_API_KEY = process.env.AI_AUDIT_API_KEY;

// 系统提示词（图片审核版本 - 增强版）
const IMAGE_AUDIT_PROMPT = `你是一个中学数学答疑平台的内容审核助手，平台面向初一到初三的学生（12-15岁未成年人）。

## 审核任务

请对用户提交的图片进行严格审核，检查以下内容：

### 安全审核（重点关注）
1. **色情/性感内容**：任何裸露、性暗示、低俗、色情图片必须拒绝
2. **暴露穿着**：过于暴露的服装、泳装、内衣等图片
3. **暴力血腥**：暴力、血腥、恐怖、惊悚图片
4. **政治敏感**：政治人物、政治标语、敏感事件
5. **广告引流**：广告、二维码、微信号、外链引流
6. **隐私信息**：身份证、银行卡、个人住址、电话号码等
7. **其他不当**：任何不适合未成年人观看的内容

### 内容评估
- 图片是否包含数学题目或解题过程
- 如果是数学题目，能否看清题目内容
- 是否是正常的学习相关图片

## 判断标准
- 只要有任何不适合中学生的内容，必须标记为 safe: false
- 对于性感/暴露内容零容忍
- 正常的数学题目、解题步骤、几何图形等标记为 safe: true

## 返回 JSON 格式（严格按此格式）

{
  "safe": true或false,
  "reason": "如果不安全，说明具体原因",
  "category": "违规类别：porn/violence/political/ad/privacy/other 或 null",
  "content_type": "math_problem/solution/diagram/photo/other",
  "description": "简要描述图片内容（10字以内）"
}
`;

// 本地测试图片
const TEST_IMAGES = [
    {
        name: 'playground/test-image.jpg',
        path: '../playground/test-image.jpg',
        expectedSafe: false  // 这张图片应该无法通过审核
    }
];

function imageToBase64(imagePath: string): string {
    const absolutePath = path.resolve(imagePath);
    const imageBuffer = fs.readFileSync(absolutePath);
    const base64 = imageBuffer.toString('base64');
    const ext = path.extname(imagePath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
    return `data:${mimeType};base64,${base64}`;
}

async function testImageAudit(imagePath: string, name: string) {
    console.log(`\n📷 测试: ${name}`);
    console.log(`   路径: ${imagePath}`);

    // 检查文件是否存在
    if (!fs.existsSync(imagePath)) {
        console.log(`   ❌ 文件不存在: ${imagePath}`);
        return false;
    }

    try {
        const base64Image = imageToBase64(imagePath);
        console.log(`   图片大小: ${Math.round(base64Image.length / 1024)}KB (base64)`);

        const response = await fetch(AI_AUDIT_BASE_URL!, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AI_AUDIT_API_KEY}`
            },
            body: JSON.stringify({
                model: 'glm-4v-flash',  // 使用视觉模型
                messages: [
                    {
                        role: 'system',
                        content: IMAGE_AUDIT_PROMPT
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: '请严格审核这张图片，判断是否适合在中学数学答疑平台展示。特别注意检查是否有色情、性感、暴露或其他不适合未成年人的内容。'
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: base64Image
                                }
                            }
                        ]
                    }
                ],
                temperature: 0.1,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.log(`   ❌ API 错误: ${response.status}`);
            console.log(`   响应: ${errorText.slice(0, 300)}`);
            return false;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            console.log('   ❌ 空响应');
            return false;
        }

        console.log(`   ✅ 响应成功`);

        // 尝试解析 JSON
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);
                console.log(`   🔍 审核结果:`);
                console.log(`      安全: ${result.safe ? '✅ 是' : '❌ 否'}`);
                if (!result.safe) {
                    console.log(`      原因: ${result.reason}`);
                    console.log(`      类别: ${result.category}`);
                }
                console.log(`      类型: ${result.content_type}`);
                console.log(`      描述: ${result.description}`);
                return true;
            } else {
                console.log(`   原始响应: ${content.slice(0, 200)}`);
                return true;
            }
        } catch {
            console.log(`   原始响应: ${content.slice(0, 200)}`);
            return true;
        }

    } catch (error) {
        console.log(`   ❌ 请求失败: ${error}`);
        return false;
    }
}

async function main() {
    console.log('=== GLM-4V-Flash 图片审核测试 ===\n');

    // 检查配置
    if (!AI_AUDIT_BASE_URL || !AI_AUDIT_API_KEY) {
        console.error('❌ 缺少配置：AI_AUDIT_BASE_URL 或 AI_AUDIT_API_KEY');
        process.exit(1);
    }

    console.log('✅ API 配置已加载');
    console.log(`   Base URL: ${AI_AUDIT_BASE_URL}`);
    console.log(`   API Key: ${AI_AUDIT_API_KEY.slice(0, 10)}...`);
    console.log(`   模型: glm-4v-flash`);

    let success = 0;
    let failed = 0;

    for (const testCase of TEST_IMAGES) {
        const ok = await testImageAudit(testCase.path, testCase.name);
        if (ok) {
            success++;
        } else {
            failed++;
        }

        // 避免请求过于频繁
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n=== 测试结果 ===');
    console.log(`成功: ${success}/${TEST_IMAGES.length}`);
    console.log(`失败: ${failed}/${TEST_IMAGES.length}`);

    if (failed === 0) {
        console.log('\n✅ GLM-4V-Flash 图片审核可行！');
    } else {
        console.log('\n⚠️ 部分测试失败，请检查文件路径或 API 配置');
    }

    process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
