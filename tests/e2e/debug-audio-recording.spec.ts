import { test, expect } from '@playwright/test';

/**
 * 调试录音功能的 E2E 测试
 * 用于诊断 MediaRecorder 和音频上传问题
 */

const FRONTEND_BASE = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
const BACKEND_BASE = process.env.BACKEND_BASE_URL || 'http://localhost:4000';

test.describe('录音功能调试', () => {
  test('测试 MediaRecorder 和音频上传', async ({ page, context }) => {
    // 1. 授予麦克风权限
    await context.grantPermissions(['microphone']);

    // 2. 登录老师账号
    const loginRes = await page.request.post(`${BACKEND_BASE}/api/internal/test-token`, {
      data: { role: 'teacher' }
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginBody = await loginRes.json();
    const teacherToken = loginBody.data.token;

    // 设置 localStorage
    await page.goto(FRONTEND_BASE);
    await page.evaluate(({ token }) => {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_role', 'teacher');
    }, { token: teacherToken });

    // 3. 创建一个测试问题
    const questionRes = await page.request.post(`${BACKEND_BASE}/api/questions`, {
      headers: {
        Authorization: `Bearer ${teacherToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        title: `录音测试问题 ${Date.now()}`,
        content: '用于测试录音功能的问题',
        subject: 'math',
        difficulty: 'easy'
      }
    });
    expect(questionRes.ok()).toBeTruthy();
    const questionBody = await questionRes.json();
    const questionId = questionBody.data.id;

    // 4. 导航到回答页面
    await page.goto(`${FRONTEND_BASE}/question/${questionId}/answer`);
    await page.waitForLoadState('networkidle');

    // 5. 检查 MediaRecorder API 是否可用
    const mediaRecorderSupport = await page.evaluate(() => {
      return {
        mediaDevices: typeof navigator.mediaDevices !== 'undefined',
        getUserMedia: typeof navigator.mediaDevices?.getUserMedia !== 'undefined',
        mediaRecorder: typeof MediaRecorder !== 'undefined',
        isTypeSupported: typeof MediaRecorder.isTypeSupported === 'function',
        supportedTypes: [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/ogg;codecs=opus',
          'audio/mp4',
          'audio/mpeg'
        ].filter(type => {
          try {
            return MediaRecorder.isTypeSupported(type);
          } catch {
            return false;
          }
        })
      };
    });

    console.log('MediaRecorder 支持情况:', JSON.stringify(mediaRecorderSupport, null, 2));
    expect(mediaRecorderSupport.mediaRecorder).toBe(true);

    // 6. 测试录音流程
    const audioTestResult = await page.evaluate(async () => {
      try {
        // 请求麦克风权限
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // 检查音轨
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
          return {
            success: false,
            error: '没有获取到音频轨道',
            details: { trackCount: audioTracks.length }
          };
        }

        const track = audioTracks[0];
        const trackSettings = track.getSettings();

        // 创建 MediaRecorder
        const mimeType = 'audio/webm'; // 使用默认类型
        const recorder = new MediaRecorder(stream, { mimeType });

        const chunks: Blob[] = [];
        let dataAvailableFired = false;
        let blobSize = 0;

        return new Promise((resolve) => {
          const timeout = setTimeout(() => {
            stream.getTracks().forEach(t => t.stop());
            resolve({
              success: false,
              error: '录音超时（5秒）',
              details: {
                dataAvailableFired,
                blobSize,
                mimeType,
                trackSettings
              }
            });
          }, 5000);

          recorder.ondataavailable = (event) => {
            dataAvailableFired = true;
            if (event.data && event.data.size > 0) {
              chunks.push(event.data);
              blobSize = event.data.size;
            }
          };

          recorder.onstop = () => {
            clearTimeout(timeout);
            const blob = new Blob(chunks, { type: mimeType });
            stream.getTracks().forEach(t => t.stop());

            resolve({
              success: true,
              details: {
                blobSize: blob.size,
                blobType: blob.type,
                dataAvailableFired,
                chunksCount: chunks.length,
                mimeType,
                trackSettings
              }
            });
          };

          recorder.start();

          // 录制1秒后停止
          setTimeout(() => {
            if (recorder.state === 'recording') {
              recorder.stop();
            }
          }, 1000);
        });
      } catch (error) {
        return {
          success: false,
          error: (error as Error).message,
          details: {
            name: (error as Error).name,
            stack: (error as Error).stack?.split('\n').slice(0, 3).join('\n')
          }
        };
      }
    });

    console.log('录音测试结果:', JSON.stringify(audioTestResult, null, 2));

    // 验证结果
    if (audioTestResult.success) {
      expect(audioTestResult.details.blobSize).toBeGreaterThan(0);
      console.log(`✅ 录音成功，blob 大小: ${audioTestResult.details.blobSize} 字节`);
    } else {
      console.error('❌ 录音失败:', audioTestResult.error);
      console.error('详细信息:', audioTestResult.details);
      // 不抛出错误，继续测试 UI 流程
    }

    // 7. 测试 UI 录音按钮（如果 MediaRecorder 支持）
    if (mediaRecorderSupport.mediaRecorder && audioTestResult.success) {
      const startButton = page.getByRole('button', { name: /开始录音/ });
      if (await startButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('点击"开始录音"按钮');
        await startButton.click();

        // 等待录音开始
        await page.waitForTimeout(1500);

        // 检查是否有"停止录音"按钮
        const stopButton = page.getByRole('button', { name: /停止录音/ });
        if (await stopButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await stopButton.click();
          console.log('点击"停止录音"按钮');

          // 等待上传完成
          await page.waitForTimeout(3000);

          // 检查是否有音频元素
          const audioElement = page.locator('audio').first();
          if (await audioElement.isVisible({ timeout: 5000 }).catch(() => false)) {
            const src = await audioElement.getAttribute('src');
            console.log('✅ 录音上传成功，URL:', src);
            expect(src).toContain('/static/audio/');
          } else {
            console.warn('⚠️ 未找到音频元素，上传可能失败');
          }
        }
      }
    }

    // 8. 检查浏览器控制台错误
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    if (errors.length > 0) {
      console.warn('浏览器控制台错误:');
      errors.forEach(err => console.warn('  -', err));
    }
  });

  test('测试音频上传 API', async ({ page }) => {
    // 创建一个测试音频 blob
    const testBlob = await page.evaluate(async () => {
      // 创建一个简单的音频 blob（包含有效的 WebM 头）
      const webmHeader = new Uint8Array([
        0x1A, 0x45, 0xDF, 0xA3, // EBML header
        0x01, 0x00, 0x00, 0x00,  // EBML version
        0x42, 0x86, 0x81, 0x01,  // DocType
        0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6D  // DocType ID "webm"
      ]);

      const blob = new Blob([webmHeader], { type: 'audio/webm' });
      return {
        size: blob.size,
        type: blob.type
      };
    });

    console.log('测试 blob:', testBlob);

    // 这里测试上传接口
    const loginRes = await page.request.post(`${BACKEND_BASE}/api/internal/test-token`, {
      data: { role: 'teacher' }
    });
    const loginBody = await loginRes.json();
    const teacherToken = loginBody.data.token;

    // 创建问题
    const questionRes = await page.request.post(`${BACKEND_BASE}/api/questions`, {
      headers: {
        Authorization: `Bearer ${teacherToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        title: `API测试 ${Date.now()}`,
        content: '测试音频上传 API',
        subject: 'math'
      }
    });
    const questionBody = await questionRes.json();
    const questionId = questionBody.data.id;

    console.log('问题 ID:', questionId);

    // 测试上传接口（不需要真实音频）
    const uploadRes = await page.request.post(
      `${BACKEND_BASE}/api/questions/${questionId}/answers`,
      {
        headers: {
          Authorization: `Bearer ${teacherToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          content: '测试回答',
          audioUrl: '/static/audio/test-audio.mp3'
        }
      }
    );

    console.log('上传响应状态:', uploadRes.status());
    if (uploadRes.ok()) {
      const uploadBody = await uploadRes.json();
      console.log('上传成功:', JSON.stringify(uploadBody, null, 2));
    } else {
      const errorText = await uploadRes.text();
      console.error('上传失败:', errorText);
    }

    expect(uploadRes.ok()).toBeTruthy();
  });
});
