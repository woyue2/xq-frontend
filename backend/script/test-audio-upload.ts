/**
 * 测试音频上传的完整流程
 *
 * 目的：模拟前端录音和上传流程，验证后端是否正常工作
 *
 * 使用方法：
 * npx tsx script/test-audio-upload.ts
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

// 模拟一个简单的音频文件（实际应该从真实录音中获取）
const createTestAudioFile = () => {
  const testDir = path.join(process.cwd(), 'backend', 'test-audio');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const testFile = path.join(testDir, 'test-audio.webm');

  // 创建一个空的webm文件（仅用于测试上传逻辑）
  // 实际应用中应该使用真实的录音数据
  const audioHeader = Buffer.from([
    0x1a,
    0x45,
    0xdf,
    0xa3, // WebM文件头
    0x01,
    0x00,
    0x00,
    0x00, // 简单数据
  ]);

  fs.writeFileSync(testFile, audioHeader);
  return testFile;
};

const testAudioUpload = async () => {
  console.log('═══════════════════════════════════════════');
  console.log('音频上传测试');
  console.log('═══════════════════════════════════════════\n');

  // 步骤1: 创建测试文件
  console.log('步骤1: 创建测试音频文件...');
  const testFile = createTestAudioFile();
  const fileStats = fs.statSync(testFile);
  console.log(`  文件路径: ${testFile}`);
  console.log(`  文件大小: ${fileStats.size} bytes`);
  console.log(`  扩展名: ${path.extname(testFile)}`);
  console.log('');

  // 步骤2: 准备上传
  console.log('步骤2: 准备上传请求...');
  const formData = new FormData();
  formData.append('file', fs.createReadStream(testFile), {
    filename: path.basename(testFile),
    contentType: 'audio/webm',
  });

  console.log(`  Content-Type: multipart/form-data`);
  console.log(`  字段名: file`);
  console.log(`  文件名: ${path.basename(testFile)}`);
  console.log(`  MIME类型: audio/webm`);
  console.log('');

  // 步骤3: 发送请求
  console.log('步骤3: 发送上传请求...');
  try {
    // 注意：这里使用本地服务器地址
    // 实际使用时需要确保后端服务正在运行
    const response = await axios.post('http://localhost:4000/api/upload/audio', formData, {
      headers: {
        ...formData.getHeaders(),
        // 注意：这里需要添加认证token
        // Authorization: 'Bearer YOUR_TOKEN_HERE'
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    console.log('  ✅ 上传成功！');
    console.log(`  响应代码: ${response.status}`);
    console.log(`  响应数据:`, response.data);
    console.log('');
  } catch (error: any) {
    console.log('  ❌ 上传失败！');
    console.log(`  错误代码: ${error.response?.status}`);
    console.log(`  错误数据:`, error.response?.data);
    console.log('');

    // 分析错误原因
    if (error.response?.status === 400) {
      console.log('🔍  错误分析 (400 Bad Request):');
      const errorCode = error.response?.data?.code;
      const errorMessage = error.response?.data?.message;

      switch (errorCode) {
        case 'INVALID_FILE_TYPE':
          console.log('  原因: MIME类型验证失败');
          console.log(`  详情: ${errorMessage}`);
          console.log('  解决: 检查file.mimetype是否以"audio/"开头');
          break;

        case 'INVALID_FILE_EXTENSION':
          console.log('  原因: 扩展名验证失败');
          console.log(`  详情: ${errorMessage}`);
          console.log('  解决: 检查文件扩展名是否在允许列表中');
          break;

        case 'FILE_TOO_LARGE':
          console.log('  原因: 文件大小超过限制');
          console.log(`  详情: ${errorMessage}`);
          console.log('  解决: 确保音频文件小于5MB');
          break;

        case 'NO_FILE':
          console.log('  原因: 未找到上传的文件');
          console.log('  解决: 确保FormData包含file字段');
          break;

        case 'PERMISSION_DENIED':
          console.log('  原因: 权限不足');
          console.log(`  详情: ${errorMessage}`);
          console.log('  解决: 确保用户角色是"teacher"');
          break;

        case 'UNAUTHORIZED':
          console.log('  原因: 未登录或token无效');
          console.log('  解决: 提供有效的认证token');
          break;

        default:
          console.log(`  未知错误: ${errorCode}`);
          console.log(`  详情: ${errorMessage}`);
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.log('  原因: 无法连接到后端服务器');
      console.log('  解决: 确保后端服务正在运行 (http://localhost:4000)');
    } else {
      console.log('  原因: 未知错误');
      console.log(`  详情: ${error.message}`);
    }
  }

  // 清理测试文件
  console.log('');
  console.log('步骤4: 清理测试文件...');
  try {
    fs.unlinkSync(testFile);
    console.log('  ✅ 测试文件已删除');
  } catch (err) {
    console.log('  ⚠️  测试文件删除失败（可忽略）');
  }

  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('测试完成');
  console.log('═══════════════════════════════════════════\n');
};

testAudioUpload().catch(console.error);
