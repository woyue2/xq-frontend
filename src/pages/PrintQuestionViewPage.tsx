import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, WarningCircle } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/useAuthStore';
import { questionService } from '@/services/api';
import type { Question } from '@/types';

const SESSION_SELECTED_IDS_KEY = 'print:selectedQuestionIds';
const SESSION_FILENAME_KEY = 'print:pdfFileName';

function formatDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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

    // 修改原因：部分浏览器在打开打印预览时会读取“当前页已稳定的 title”，
    // 若只在点击打印瞬间设置标题，可能来不及生效。
    const previousTitle = document.title;
    document.title = printFileName;

    return () => {
      document.title = previousTitle;
    };
  }, [printFileName]);

  const handlePrint = () => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>('.print-card'));
    if (cards.length === 0) {
      window.requestAnimationFrame(() => {
        window.print();
      });
      return;
    }

    const nextFileName = printFileName.trim() || '打印题目';
    const popup = window.open('', '_blank');
    if (!popup) {
      toast.error('浏览器拦截了打印窗口，请允许弹窗后重试');
      return;
    }

    // 修改原因：部分浏览器仅使用“打印源窗口标题”作为 PDF 默认文件名，独立窗口方式命中率更高。
    const html = `
      <!doctype html>
      <html lang="zh-CN">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${escapeHtml(nextFileName)}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              color: #111827;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, "PingFang SC", "Microsoft YaHei", sans-serif;
            }
            .print-root {
              padding: 0;
              margin: 0;
            }
            .print-card {
              border: 1px solid #d1d5db;
              border-radius: 10px;
              padding: 12px;
              margin-bottom: 8mm;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .print-image-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 3mm;
              margin-top: 12px;
            }
            .print-question-image {
              width: 100%;
              max-height: 78mm;
              object-fit: contain;
              background: #ffffff;
            }
            .print-answer-space {
              min-height: 42mm;
              background: #ffffff !important;
            }
          </style>
        </head>
        <body>
          <main class="print-root">${cards.map((card) => card.outerHTML).join('')}</main>
        </body>
      </html>
    `;

    popup.document.open();
    popup.document.write(html);
    popup.document.close();

    let hasPrinted = false;
    const triggerPrint = () => {
      if (hasPrinted) return;
      hasPrinted = true;
      popup.focus();
      popup.print();
    };

    const waitForImagesThenPrint = () => {
      const images = Array.from(popup.document.images);
      if (images.length === 0) {
        window.setTimeout(triggerPrint, 120);
        return;
      }

      let finished = 0;
      const done = () => {
        finished += 1;
        if (finished >= images.length) {
          window.setTimeout(triggerPrint, 120);
        }
      };

      images.forEach((image) => {
        if (image.complete) {
          done();
        } else {
          image.addEventListener('load', done, { once: true });
          image.addEventListener('error', done, { once: true });
        }
      });

      // ⚠️ 不确定因素：若网络图片长期 pending，兜底在 2.5 秒后直接触发打印，避免无响应。
      window.setTimeout(triggerPrint, 2500);
    };

    popup.onload = waitForImagesThenPrint;
    if (popup.document.readyState === 'complete') {
      waitForImagesThenPrint();
    }
    popup.onafterprint = () => {
      popup.close();
    };
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
          立即打印
        </Button>
      </div>

      <div className="print-toolbar bg-white rounded-2xl p-4 shadow-sm space-y-2">
        <p className="text-sm text-gray-700 font-medium">打印说明</p>
        <p className="text-xs text-gray-500">{pageHint}</p>
        <p className="text-xs text-gray-500">每道题包含题目图片与疑问描述，适合家长批量打印后离线复习。</p>
        {printFileName ? (
          <p className="text-xs text-gray-500">建议保存文件名：{printFileName}</p>
        ) : null}
        {/* ⚠️ 不确定因素：不同浏览器对 PDF 默认文件名策略可能不同，document.title 方式并非 100% 强制生效。 */}
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
