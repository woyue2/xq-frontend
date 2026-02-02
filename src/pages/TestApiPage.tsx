import { useEffect, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { compressImage } from '@/lib/image-compress';

type SignatureResponse = {
  code: number;
  data: {
    uploadUrl: string;
    key: string;
    policy: string;
    signature: string;
    expireAt: number;
  };
};

export function TestApiPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadUrl, setUploadUrl] = useState<string>('');
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [compressEnabled, setCompressEnabled] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'teacher') {
      toast.error('只有老师可以访问测试页面');
      navigate('/');
    }
  }, [user, navigate]);

  const fetchSignature = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<SignatureResponse>('/upload/signature', {
        params: { type: 'image' }
      });

      if (res.data.code !== 200) {
        throw new Error('获取上传签名失败');
      }

      const url = res.data.data.uploadUrl;
      setUploadUrl(url);

      try {
        const parsed = new URL(url);
        const base = `${parsed.origin}${parsed.pathname}`;
        const tk = parsed.searchParams.get('token') ?? '';
        setBaseUrl(base);
        setToken(tk);
      } catch {
        // 非法 URL 时仅原样展示
        setBaseUrl('');
        setToken('');
      }

      toast.success('已获取当前图床配置');
    } catch (err: any) {
      setError(err?.message || '获取上传签名失败');
      toast.error('获取上传签名失败，请检查后端配置');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 页面首次进入时自动拉取一次，方便老师查看
    void fetchSignature();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const appendLog = (msg: string) => {
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()} ${msg}`]);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    if (selected) {
      appendLog(`已选择文件：${selected.name} (${(selected.size / 1024 / 1024).toFixed(2)} MB)`);
    }
  };

  const handleTestUpload = async () => {
    setError(null);
    if (!baseUrl) {
      toast.error('请先确认 Base URL');
      setError('缺少 Base URL');
      return;
    }
    if (!token) {
      toast.error('请先填写图床 Token');
      setError('缺少 Token');
      return;
    }
    if (!file) {
      toast.error('请先选择要上传的图片');
      setError('未选择文件');
      return;
    }

    setUploading(true);
    setLogs([]);
    try {
      let uploadFile: File = file;

      if (compressEnabled) {
        appendLog('开始压缩图片...');
        uploadFile = await compressImage(file);
        appendLog(`压缩完成，大小约 ${(uploadFile.size / 1024 / 1024).toFixed(2)} MB`);
      } else {
        appendLog('已关闭压缩，直接上传原图');
      }

      const url = baseUrl.replace(/\/+$/, '');
      const formData = new FormData();
      formData.append('file', uploadFile, uploadFile.name || 'image.jpg');

      const authHeader = token.toLowerCase().startsWith('bearer ')
        ? token
        : `Bearer ${token}`;

      appendLog(`请求地址: ${url}`);
      appendLog(`Authorization: ${authHeader}`);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: authHeader
        },
        body: formData
      });

      appendLog(`HTTP 状态码: ${res.status}`);

      let data: any = null;
      try {
        data = await res.json();
        appendLog(`响应内容: ${JSON.stringify(data, null, 2)}`);
      } catch {
        appendLog('响应内容不是 JSON，已跳过解析');
      }

      if (res.ok) {
        toast.success('上传请求已发送，返回 2xx');
      } else {
        toast.error('上传返回非 2xx，请检查日志');
      }
    } catch (err: any) {
      const msg = err?.message || '上传过程中发生错误';
      setError(msg);
      appendLog(`错误: ${msg}`);
      toast.error('上传失败，请查看日志');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <Card className="rounded-3xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">图床上传配置测试（教师专用）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            本页用于向老师展示当前后端配置的图片上传地址，方便和图床服务对接或排查问题。
          </p>

          <div className="space-y-2">
            <Label htmlFor="upload-url">当前 uploadUrl（后端签名返回）</Label>
            <Input
              id="upload-url"
              value={uploadUrl}
              className="font-mono text-xs"
              onChange={(e) => setUploadUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="base-url">解析出的 Base URL</Label>
            <Input
              id="base-url"
              value={baseUrl}
              className="font-mono text-xs"
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="token">token（如配置了 OSS_UPLOAD_TOKEN）</Label>
            <Input
              id="token"
              value={token}
              className="font-mono text-xs"
              onChange={(e) => setToken(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-xs text-red-500">
              错误：{error}
            </p>
          )}

          <div className="space-y-2 pt-2">
            <Label htmlFor="file">选择要上传的图片（本地直传图床，仅测试）</Label>
            <Input id="file" type="file" accept="image/*" onChange={handleFileChange} />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="compress-toggle"
              type="checkbox"
              checked={compressEnabled}
              onChange={(e) => setCompressEnabled(e.target.checked)}
            />
            <Label htmlFor="compress-toggle" className="text-xs text-gray-600">
              启用自动压缩（推荐：大图时减小体积）
            </Label>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchSignature}
              disabled={loading}
            >
              {loading ? '刷新中...' : '重新获取配置'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestUpload}
              disabled={uploading}
            >
              {uploading ? '上传中...' : '本地上传测试'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate('/create')}
            >
              返回提问页
            </Button>
          </div>

          <p className="text-xs text-gray-400 pt-2">
            提示：如果 Base URL 或 token 与图床服务提供的配置不一致，请检查后端
            <code className="mx-1">OSS_UPLOAD_BASE_URL</code>
            和
            <code className="mx-1">OSS_UPLOAD_TOKEN</code>
            环境变量。
          </p>

          {logs.length > 0 && (
            <div className="mt-4">
              <Label className="text-xs text-gray-600">调试日志</Label>
              <pre className="mt-1 max-h-48 overflow-auto text-[11px] bg-gray-50 border border-gray-200 rounded-md p-2 font-mono whitespace-pre-wrap">
                {logs.join('\n')}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
