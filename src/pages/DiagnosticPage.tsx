import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDiagnosticStore } from '@/stores/useDiagnosticStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, ArrowCounterClockwise, CheckCircle, XCircle, WarningCircle, Clock } from '@phosphor-icons/react';
import { runDiagnosticTests } from '@/lib/test-runner';
import { toast } from 'sonner';

export function DiagnosticPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { results, isRunning, progress, logs, startTests, reset } = useDiagnosticStore();

  // 仅允许已登录老师访问诊断工具
  useEffect(() => {
    if (!user) {
      toast.error('请先登录');
      navigate('/login');
      return;
    }
    if (user.role !== 'teacher') {
      toast.error('该功能仅对老师开放');
      navigate('/');
    }
  }, [user, navigate]);
  const handleStart = async () => {
    if (isRunning) {
      return;
    }

    // 额外保护：在点击诊断按钮时再次校验角色，防止边缘态下误触发
    if (!user) {
      toast.error('请先登录');
      navigate('/login');
      return;
    }

    if (user.role !== 'teacher') {
      toast.error('该功能仅对老师开放');
      navigate('/');
      return;
    }

    startTests();
    await runDiagnosticTests();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failure': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running': return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      default: return <WarningCircle className="w-5 h-5 text-gray-300" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-700 hover:bg-green-100';
      case 'failure': return 'bg-red-100 text-red-700 hover:bg-red-100';
      case 'running': return 'bg-blue-100 text-blue-700 hover:bg-blue-100';
      default: return 'bg-gray-100 text-gray-700 hover:bg-gray-100';
    }
  };

  // Calculate stats
  const total = results.length;
  const passed = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'failure').length;
  const avgDuration = results.reduce((acc, curr) => acc + (curr.duration || 0), 0) / (passed + failed) || 0;

  // 在权限校验尚未通过前不渲染内容，避免闪烁
  if (!user || user.role !== 'teacher') {
    return null;
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">系统接口诊断工具</h1>
            <p className="text-sm text-gray-500 mt-1">自动化检测接口可用性、延迟及数据一致性</p>
        </div>
        <div className="flex gap-3">
            <Button variant="outline" onClick={reset} disabled={isRunning}>
                <ArrowCounterClockwise className="w-4 h-4 mr-2" />
                重置
            </Button>
            <Button onClick={handleStart} disabled={isRunning} className="bg-morandi-5 hover:bg-morandi-5/90">
                <Play className="w-4 h-4 mr-2" />
                {isRunning ? '诊断中...' : '开始诊断'}
            </Button>
        </div>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
            <CardContent className="pt-6">
                <div className="text-2xl font-bold">{total}</div>
                <div className="text-xs text-gray-500">测试用例总数</div>
            </CardContent>
        </Card>
        <Card>
            <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{passed}</div>
                <div className="text-xs text-gray-500">通过数量</div>
            </CardContent>
        </Card>
        <Card>
            <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">{failed}</div>
                <div className="text-xs text-gray-500">失败数量</div>
            </CardContent>
        </Card>
        <Card>
            <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">{avgDuration.toFixed(0)}ms</div>
                <div className="text-xs text-gray-500">平均耗时</div>
            </CardContent>
        </Card>
      </div>

      {/* 进度条 */}
      {isRunning && (
        <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
                <span>诊断进度</span>
                <span>{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 测试结果列表 */}
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle className="text-lg">测试详情</CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-3">
                        {results.map((result) => (
                            <div key={result.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors">
                                <div className="flex items-center gap-3">
                                    {getStatusIcon(result.status)}
                                    <div>
                                        <div className="font-medium text-sm text-gray-900">{result.name}</div>
                                        <div className="text-xs text-gray-500">{result.description}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {result.duration !== undefined && (
                                        <span className="text-xs font-mono text-gray-400">{result.duration}ms</span>
                                    )}
                                    <Badge variant="secondary" className={getStatusColor(result.status)}>
                                        {result.status === 'success' ? '通过' : result.status === 'failure' ? '失败' : result.status === 'running' ? '执行中' : '等待'}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                        {results.length === 0 && (
                            <div className="text-center text-gray-400 py-10">
                                点击右上角“开始诊断”启动测试
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>

        {/* 实时日志 */}
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">运行日志</CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[500px] bg-black rounded-lg p-4 font-mono text-xs text-green-400">
                    <div className="space-y-1">
                        {logs.map((log, index) => (
                            <div key={index}>{log}</div>
                        ))}
                        {logs.length === 0 && <span className="text-gray-600">// 等待运行...</span>}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
