#!/usr/bin/env tsx
/**
 * 音频上传诊断工具
 * 用于诊断音频上传失败的原因
 */

// 简化诊断脚本，不依赖 AppError

console.log('='.repeat(60));
console.log('🔍 音频上传诊断工具');
console.log('='.repeat(60));
console.log('');

// 1. 测试 path.extname 行为
import path from 'path';

console.log('1️⃣ 测试文件扩展名提取:');
const testFiles = [
  'answer-audio-1234567890.webm',
  'answer-audio-1234567890', // 没有扩展名
  'blob', // 空名称
  'audio.webm',
];

testFiles.forEach((file) => {
  const ext = path.extname(file).toLowerCase();
  const allowed = ['.mp3', '.wav', '.m4a', '.webm', '.ogg', '.aac'].includes(ext);
  console.log(`   - File: "${file}" -> ext: "${ext}" -> ${allowed ? '✅ 允许' : '❌ 拒绝'}`);
});
console.log('');

// 2. 测试 MIME 类型
console.log('2️⃣ 测试 Blob MIME 类型:');
const blobTests = [
  { type: 'audio/webm', chunks: [new Blob(['test'], { type: 'audio/webm' })] },
  { type: '', chunks: [new Blob(['test'])] }, // 空类型
  { type: 'video/webm', chunks: [new Blob(['test'], { type: 'video/webm' })] }, // 错误类型
];

blobTests.forEach(({ type, chunks }) => {
  const blob = new Blob(chunks, { type });
  const isValid = blob.type.startsWith('audio/');
  console.log(
    `   - Type: "${type || '(empty)'}" -> Blob.type: "${blob.type}" -> ${isValid ? '✅ 有效' : '❌ 无效'}`,
  );
});
console.log('');

// 3. 模拟验证逻辑
console.log('3️⃣ 模拟文件验证逻辑:');

const ALLOWED_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.webm', '.ogg', '.aac'];
const MAX_AUDIO_FILE_SIZE = 5 * 1024 * 1024;

interface TestFile {
  originalname: string;
  mimetype: string;
  size: number;
}

const testUploads: TestFile[] = [
  { originalname: 'answer-audio-1234567890.webm', mimetype: 'audio/webm', size: 1024 },
  { originalname: 'answer-audio-1234567890.webm', mimetype: 'video/webm', size: 1024 },
  { originalname: 'answer-audio-1234567890.webm', mimetype: 'audio/webm', size: 6 * 1024 * 1024 },
  { originalname: 'answer-audio-1234567890.mp3', mimetype: 'audio/mp3', size: 1024 },
  { originalname: 'answer-audio-1234567890', mimetype: 'audio/webm', size: 1024 }, // 无扩展名
  { originalname: 'blob', mimetype: 'audio/webm', size: 1024 }, // 只有blob名
];

testUploads.forEach((file, index) => {
  console.log(`\n   测试 ${index + 1}:`);
  console.log(`   - 文件名: ${file.originalname}`);
  console.log(`   - MIME类型: ${file.mimetype}`);
  console.log(`   - 文件大小: ${file.size} bytes (${(file.size / 1024).toFixed(2)} KB)`);

  let error = '';
  let errorCode = '';

  // 检查文件大小
  if (file.size > MAX_AUDIO_FILE_SIZE) {
    error = '音频文件超过5MB限制';
    errorCode = 'FILE_TOO_LARGE';
    console.log(`   ❌ 大小超限`);
  } else {
    console.log(`   ✅ 大小检查通过`);
  }

  if (!error) {
    // 检查 MIME 类型
    if (!file.mimetype || !file.mimetype.startsWith('audio/')) {
      error = '仅支持音频文件上传';
      errorCode = 'INVALID_FILE_TYPE';
      console.log(`   ❌ MIME类型无效`);
    } else {
      console.log(`   ✅ MIME类型有效`);
    }
  }

  if (!error) {
    // 检查文件扩展名
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_AUDIO_EXTENSIONS.includes(ext)) {
      error = `不支持的音频格式: ${ext}`;
      errorCode = 'INVALID_FILE_EXTENSION';
      console.log(`   ❌ 扩展名无效: ${ext}`);
    } else {
      console.log(`   ✅ 扩展名有效: ${ext}`);
    }
  }

  if (error) {
    console.log(`   ⛔ 错误: ${error} (${errorCode})`);
  } else {
    console.log(`   ✅ 验证通过，可以上传`);
  }
});

console.log('');
console.log('='.repeat(60));
console.log('📋 常见失败原因:');
console.log('='.repeat(60));
console.log('1. Blob.type 为空或不是 audio/ 开头');
console.log('2. 文件名没有扩展名或扩展名不在允许列表中');
console.log('3. 文件大小超过 5MB');
console.log('4. 用户不是教师角色（权限检查失败）');
console.log('');
console.log('🔧 建议的调试步骤:');
console.log('='.repeat(60));
console.log('1. 在浏览器控制台检查 [录音] 日志，确认 blob.type');
console.log('2. 检查录音器的 mimeType 属性');
console.log('3. 确认用户登录为教师角色');
console.log('4. 查看后端日志中的 [音频上传] 验证日志');
console.log('');
console.log('✅ 诊断完成');
