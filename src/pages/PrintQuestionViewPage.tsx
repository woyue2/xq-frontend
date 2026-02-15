import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, WarningCircle } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/useAuthStore';
import { questionService } from '@/services/api';
import { parentService } from '@/services/parentService';
import type { Question } from '@/types';

const SESSION_SELECTED_IDS_KEY = 'print:selectedQuestionIds';
const SESSION_FILENAME_KEY = 'print:pdfFileName';

function formatDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function PrintQuestionViewPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [missingIds, setMissingIds] = useState<string[]>([]);
  const [printFileName, setPrintFileName] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'parent') {
      toast.error('仅家长可使用打印题目功能');
      navigate('/');
      return;
    }

    const loadSelectedQuestions = async () => {
      setIsLoading(true);
      try {
        const raw = sessionStorage.getItem(SESSION_SELECTED_IDS_KEY);
        const selectedIds = raw ? (JSON.parse(raw) as string[]) : [];
        const preferredFileName = sessionStorage.getItem(SESSION_FILENAME_KEY) || '';

        if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
          toast.error('请先在选题页勾选题目');
          navigate('/print/questions/select');
          return;
        }

        // 修改原因：保持最小改动，复用现有单题详情接口按 ID 批量拉取，不新增后端聚合接口。
        const results = await Promise.allSettled(
          selectedIds.map((id) => questionService.getQuestionById(id))
        );

        const successMap = new Map<string, Question>();
        const failed: string[] = [];
        results.forEach((item, index) => {
          const sourceId = selectedIds[index];
          if (item.status === 'fulfilled' && item.value?.id) {
            successMap.set(item.value.id, item.value);
          } else {
            failed.push(sourceId);
          }
        });

        // 修改原因：打印顺序按家长在选题页的勾选顺序渲染，便于复习节奏控制。
        const ordered = selectedIds
          .map((id) => successMap.get(id))
          .filter((item): item is Question => Boolean(item));

        if (ordered.length === 0) {
          toast.error('没有可打印的题目，请重新选择');
          navigate('/print/questions/select');
          return;
        }

        if (failed.length > 0) {
          toast.warning(`有 ${failed.length} 道题加载失败，已自动跳过`);
        }

        // 修改原因：剔除已失效题目 ID，避免用户后续再次进入打印页时重复触发同一批 404。
        try {
          sessionStorage.setItem(
            SESSION_SELECTED_IDS_KEY,
            JSON.stringify(ordered.map((item) => item.id))
          );
        } catch {
          // ⚠️ 不确定因素：极端隐私模式可能禁用 sessionStorage；此处静默降级，不影响当前打印流程。
        }

        setQuestions(ordered);
        setMissingIds(failed);
        setPrintFileName(preferredFileName);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('加载打印预览失败', error);
        toast.error('加载打印预览失败，请稍后重试');
      } finally {
        setIsLoading(false);
      }
    };

    loadSelectedQuestions();
  }, [navigate, user]);

  const pageHint = useMemo(() => {
    // 修改原因：向用户明确“自动分页”行为，减少“每页固定几题”的认知偏差。
    if (questions.length <= 2) return '当前内容预计 1-2 题/页，浏览器会按 A4 自动分页。';
    return '题目按内容高度自动分页；内容越长，单页题数越少。';
  }, [questions.length]);

  useEffect(() => {
    if (!printFileName.trim()) return;

    // 修改原因：导出失败时，用户可能手动截图/另存页面；保持标题与建议文件名一致，便于识别。
    const previousTitle = document.title;
    document.title = printFileName;

    return () => {
      document.title = previousTitle;
    };
  }, [printFileName]);

  const handlePrint = async () => {
    if (questions.length === 0) {
      toast.error('当前没有可打印内容');
      return;
    }

    const nextFileName = printFileName.trim() || '打印题目';
    const questionIds = questions.map((item) => item.id);

    try {
      // 修改原因：移动端无法稳定使用 window.print，改为后端生成 PDF 并交给系统下载/预览。
      const response = await parentService.downloadQuestionsPdf(questionIds, nextFileName);

      const blob = response.data as Blob;
      const contentDisposition = response.headers?.['content-disposition'];
      const encodedNameMatch =
        typeof contentDisposition === 'string'
          ? contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
          : null;
      const decodedName = encodedNameMatch?.[1]
        ? decodeURIComponent(encodedNameMatch[1])
        : `${nextFileName}.pdf`;

      const objectUrl = window.URL.createObjectURL(blob);
      const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

      if (isMobile) {
        // 修改原因：移动端优先新页预览，让用户使用系统“分享/存储到文件”流程保存 PDF。
        const opened = window.open(objectUrl, '_blank');
        if (!opened) {
          toast.error('浏览器拦截了新页面，请允许后重试');
        }
      } else {
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = decodedName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      const missingHeader = response.headers?.['x-print-missing-ids'];
      if (typeof missingHeader === 'string' && missingHeader.trim() !== '') {
        toast.warning('部分题目已失效或暂无权限，导出时已自动跳过');
      }

      window.setTimeout(() => {
        window.URL.revokeObjectURL(objectUrl);
      }, 30_000);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('生成 PDF 失败', error);
      toast.error('生成 PDF 失败，请稍后重试');
    }
  };

  if (!user || user.role !== 'parent') {
    return null;
  }

  return (
    <div className="print-root max-w-4xl mx-auto w-full px-4 py-4 space-y-4">
      <style>
        {`
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          @media print {
            body {
              background: #ffffff !important;
            }
            .print-toolbar {
              display: none !important;
            }
            .print-root {
              max-width: none !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
            }
            .print-card {
              box-shadow: none !important;
              border: 1px solid #d1d5db !important;
              break-inside: avoid;
              page-break-inside: avoid;
              margin-bottom: 8mm !important;
            }
            .print-image-grid {
              gap: 3mm !important;
            }
            .print-question-image {
              max-height: 78mm !important;
              width: 100% !important;
              object-fit: contain !important;
              background: #ffffff !important;
            }
            .print-answer-space {
              min-height: 42mm !important;
              background: #ffffff !important;
            }
          }
        `}
      </style>

      <div className="print-toolbar flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/print/questions/select')} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-bold">打印预览</h1>
          <Badge className="bg-gray-100 text-gray-700 border-0">共 {questions.length} 题</Badge>
        </div>
        <Button onClick={handlePrint} className="bg-morandi-5 hover:bg-morandi-5/90">
          <Printer className="w-4 h-4 mr-1" />
          导出 PDF
        </Button>
      </div>

      <div className="print-toolbar bg-white rounded-2xl p-4 shadow-sm space-y-2">
        <p className="text-sm text-gray-700 font-medium">打印说明</p>
        <p className="text-xs text-gray-500">{pageHint}</p>
        <p className="text-xs text-gray-500">每道题包含题目图片与疑问描述，点击“导出 PDF”后可下载或预览。</p>
        {printFileName ? (
          <p className="text-xs text-gray-500">建议保存文件名：{printFileName}</p>
        ) : null}
        {/* ⚠️ 不确定因素：移动端 WebView 对 PDF 打开策略不一致，个别机型可能表现为“直接下载”而非“新页预览”。 */}
        {/* ⚠️ 不确定因素：语音内容与超长回答在纸质场景可读性较差，当前方案默认不进入打印版面。 */}
      </div>

      {missingIds.length > 0 ? (
        <div className="print-toolbar bg-amber-50 border border-amber-200 rounded-2xl p-3 text-amber-700 text-xs flex items-center gap-2">
          <WarningCircle className="w-4 h-4 shrink-0" />
          部分题目已失效或暂无权限，已自动跳过打印。
        </div>
      ) : null}

      {isLoading ? (
        <div className="bg-white rounded-2xl p-10 text-center text-gray-400 shadow-sm">加载打印内容中...</div>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <article key={question.id} className="print-card bg-white rounded-2xl p-4 shadow-sm border border-transparent">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="text-base font-bold text-gray-800">第 {index + 1} 题</h2>
                <span className="text-xs text-gray-400">{formatDate(question.createdAt)}</span>
              </div>

              <p className="text-sm font-semibold text-gray-900 leading-6">{question.title || '未命名题目'}</p>
              <p className="text-sm text-gray-700 leading-6 mt-2 whitespace-pre-wrap">
                {question.content?.trim() ? question.content : '（未填写疑问描述）'}
              </p>

              {Array.isArray(question.images) && question.images.length > 0 ? (
                <div className="print-image-grid grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  {question.images.map((url, imageIndex) => (
                    <div key={`${question.id}-${imageIndex}`} className="rounded-xl border border-gray-200 overflow-hidden">
                      <img
                        src={url}
                        alt={`question-${index + 1}-image-${imageIndex + 1}`}
                        className="print-question-image w-full h-64 object-contain bg-white"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 mt-3">（本题未上传图片）</p>
              )}

              {/* 修改原因：按需求在每道题后保留可手写作答的空白区域，避免题目连续紧贴打印。 */}
              <section className="mt-4">
                <p className="text-xs text-gray-400 mb-2">答题区</p>
                <div
                  className="print-answer-space rounded-xl border border-dashed border-gray-300 min-h-[180px]"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(to bottom, #ffffff 0px, #ffffff 27px, #f3f4f6 28px)',
                  }}
                />
              </section>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
