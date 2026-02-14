import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Checks, XCircle } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/useAuthStore';
import { profileService } from '@/services/api';
import { parentService } from '@/services/parentService';

type SourceFilter = 'all' | 'favorites' | 'children';

type PrintQuestionCandidate = {
  id: string;
  title: string;
  content?: string | null;
  createdAt: string;
  fromFavorites: boolean;
  fromChildren: boolean;
  childNames: string[];
};

const SESSION_SELECTED_IDS_KEY = 'print:selectedQuestionIds';
const SESSION_FILENAME_KEY = 'print:pdfFileName';

function formatFileTimestamp(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}${mm}${dd}_${hh}${mi}`;
}

export function PrintQuestionSelectPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [candidates, setCandidates] = useState<PrintQuestionCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'parent') {
      toast.error('仅家长可使用打印题目功能');
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user || user.role !== 'parent') return;

    const loadCandidates = async () => {
      setIsLoading(true);
      try {
        const favoriteMap = new Map<string, PrintQuestionCandidate>();

        // 修改原因：家长“打印题目”需覆盖全部收藏，不只当前分页。
        let favoritePage = 1;
        while (true) {
          // eslint-disable-next-line no-await-in-loop
          const favoritePageData = await profileService.getMyFavorites({ page: favoritePage, pageSize: 100 });
          const list = Array.isArray(favoritePageData.list) ? favoritePageData.list : [];
          list.forEach((item) => {
            favoriteMap.set(item.id, {
              id: item.id,
              title: item.title,
              content: item.content,
              createdAt: item.createdAt,
              fromFavorites: true,
              fromChildren: false,
              childNames: [],
            });
          });
          const totalPages = favoritePageData.pagination?.totalPages ?? 1;
          if (favoritePage >= totalPages) break;
          favoritePage += 1;
        }

        const childrenRes = await parentService.getChildren();
        const children = Array.isArray(childrenRes.data?.data) ? childrenRes.data.data : [];

        // 修改原因：同一页面需要汇总“所有孩子”的题目，逐个孩子拉取并合并去重。
        for (const child of children) {
          let childPage = 1;
          while (true) {
            // eslint-disable-next-line no-await-in-loop
            const childPageRes = await parentService.getChildQuestions(child.id, { page: childPage, pageSize: 100 });
            const childData = childPageRes.data?.data;
            const childQuestions = Array.isArray(childData?.list) ? childData.list : [];

            childQuestions.forEach((question) => {
              const existing = favoriteMap.get(question.id);
              if (existing) {
                existing.fromChildren = true;
                if (!existing.childNames.includes(child.name)) {
                  existing.childNames.push(child.name);
                }
                // 题目列表接口通常内容更完整，优先保留非空疑问文本。
                if (!existing.content && question.content) {
                  existing.content = question.content;
                }
              } else {
                favoriteMap.set(question.id, {
                  id: question.id,
                  title: question.title,
                  content: question.content,
                  createdAt: question.createdAt,
                  fromFavorites: false,
                  fromChildren: true,
                  childNames: [child.name],
                });
              }
            });

            const totalPages = childData?.pagination?.totalPages ?? 1;
            if (childPage >= totalPages) break;
            childPage += 1;
          }
        }

        const merged = Array.from(favoriteMap.values()).sort((a, b) => {
          const tsA = new Date(a.createdAt).getTime();
          const tsB = new Date(b.createdAt).getTime();
          return tsB - tsA;
        });

        setCandidates(merged);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('加载打印候选题目失败', error);
        toast.error('加载打印题目失败，请稍后重试');
      } finally {
        setIsLoading(false);
      }
    };

    loadCandidates();
  }, [user]);

  const filteredCandidates = useMemo(() => {
    if (sourceFilter === 'favorites') {
      return candidates.filter((item) => item.fromFavorites);
    }
    if (sourceFilter === 'children') {
      return candidates.filter((item) => item.fromChildren);
    }
    return candidates;
  }, [candidates, sourceFilter]);

  const allVisibleSelected =
    filteredCandidates.length > 0 && filteredCandidates.every((item) => selectedIds.has(item.id));

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredCandidates.forEach((item) => next.delete(item.id));
      } else {
        filteredCandidates.forEach((item) => next.add(item.id));
      }
      return next;
    });
  };

  const handleBack = () => {
    // 修改原因：修复“返回箭头无响应/返回异常”场景；无历史栈时兜底回个人页。
    const hasHistory = window.history.length > 1;
    if (hasHistory) {
      navigate(-1);
      return;
    }
    navigate('/profile');
  };

  const goPrint = () => {
    if (selectedIds.size === 0) {
      toast.error('请先勾选至少1道题');
      return;
    }

    try {
      sessionStorage.setItem(SESSION_SELECTED_IDS_KEY, JSON.stringify(Array.from(selectedIds)));

      // 修改原因：按需求给 PDF 保存弹窗提供“孩子姓名+时间”默认文件名线索。
      const selectedCandidates = candidates.filter((item) => selectedIds.has(item.id));
      const uniqueChildNames = Array.from(
        new Set(selectedCandidates.flatMap((item) => item.childNames).filter(Boolean))
      );
      const childNamePart =
        uniqueChildNames.length === 0
          ? '孩子题目'
          : uniqueChildNames.length === 1
            ? uniqueChildNames[0]
            : `${uniqueChildNames[0]}等${uniqueChildNames.length}位孩子`;
      const fileName = `${childNamePart}_${formatFileTimestamp()}`;
      sessionStorage.setItem(SESSION_FILENAME_KEY, fileName);
    } catch {
      // ⚠️ 不确定因素：极端隐私模式可能禁用 sessionStorage；当前仅提示用户重试，避免引入复杂回退方案。
      toast.error('暂存打印题目失败，请检查浏览器设置');
      return;
    }

    navigate('/print/questions/view');
  };

  if (!user || user.role !== 'parent') {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-bold">打印题目</h1>
        </div>
        <Button onClick={goPrint} className="bg-morandi-5 hover:bg-morandi-5/90">
          <Printer className="w-4 h-4 mr-1" />
          去打印（{selectedIds.size}）
        </Button>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
        <p className="text-sm text-gray-700 font-medium">用途说明</p>
        <p className="text-xs text-gray-500">可从“我的收藏 + 孩子全部题目”中勾选，进入打印页后使用浏览器原生打印。</p>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-wrap gap-2">
        <Button
          variant={sourceFilter === 'all' ? 'default' : 'outline'}
          onClick={() => setSourceFilter('all')}
          className={sourceFilter === 'all' ? 'bg-morandi-5 hover:bg-morandi-5/90' : ''}
        >
          全部
        </Button>
        <Button
          variant={sourceFilter === 'favorites' ? 'default' : 'outline'}
          onClick={() => setSourceFilter('favorites')}
          className={sourceFilter === 'favorites' ? 'bg-morandi-5 hover:bg-morandi-5/90' : ''}
        >
          我的收藏
        </Button>
        <Button
          variant={sourceFilter === 'children' ? 'default' : 'outline'}
          onClick={() => setSourceFilter('children')}
          className={sourceFilter === 'children' ? 'bg-morandi-5 hover:bg-morandi-5/90' : ''}
        >
          孩子题目
        </Button>
        <Button variant="outline" onClick={toggleAllVisible}>
          {allVisibleSelected ? <XCircle className="w-4 h-4 mr-1" /> : <Checks className="w-4 h-4 mr-1" />}
          {allVisibleSelected ? '取消当前筛选全选' : '全选当前筛选'}
        </Button>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl p-10 text-center text-gray-400 shadow-sm">加载中...</div>
      ) : filteredCandidates.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center text-gray-400 shadow-sm">暂无可打印题目</div>
      ) : (
        <div className="space-y-3">
          {filteredCandidates.map((item) => {
            const sourceLabel = item.fromFavorites && item.fromChildren
              ? '收藏 + 孩子题目'
              : item.fromFavorites
                ? '收藏'
                : '孩子题目';
            return (
              <label key={item.id} className="block bg-white rounded-2xl p-4 shadow-sm cursor-pointer">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 w-4 h-4 accent-morandi-5"
                    checked={selectedIds.has(item.id)}
                    onChange={(event) => toggleOne(item.id, event.target.checked)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge className="bg-gray-100 text-gray-700 border-0">{sourceLabel}</Badge>
                      {item.childNames.length > 0 ? (
                        <Badge className="bg-blue-50 text-blue-700 border-0">
                          {item.childNames.join('、')}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="font-medium text-gray-800 line-clamp-2">{item.title}</p>
                    {item.content ? (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.content}</p>
                    ) : (
                      <p className="text-sm text-gray-400 mt-1">未填写疑问描述</p>
                    )}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
