import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Checks, XCircle } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/useAuthStore';
import { profileService, questionService } from '@/services/api';
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
const SESSION_RETURN_TO_KEY = 'print:returnTo';

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
    if (user.role !== 'parent' && user.role !== 'student' && user.role !== 'teacher') {
      toast.error('当前账号不可使用打印题目功能');
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user || (user.role !== 'parent' && user.role !== 'student' && user.role !== 'teacher')) return;

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

        if (user.role === 'parent') {
          const childrenRes = await parentService.getChildren();
          const children = Array.isArray(childrenRes.data?.data) ? childrenRes.data.data : [];

          // 修改原因：保持原家长能力，继续汇总“所有已绑定孩子”的题目。
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
        } else if (user.role === 'student') {
          // 修改原因：按需求开放学生打印“自己的提问”，复用现有问题列表接口（authorId=当前用户）。
          let ownPage = 1;
          while (true) {
            // eslint-disable-next-line no-await-in-loop
            const ownQuestionData = await questionService.getQuestions({
              page: ownPage,
              pageSize: 100,
              authorId: user.id
            });
            const ownQuestions = Array.isArray(ownQuestionData.list) ? ownQuestionData.list : [];

            ownQuestions.forEach((question) => {
              const existing = favoriteMap.get(question.id);
              if (existing) {
                existing.fromChildren = true;
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
                  childNames: [],
                });
              }
            });

            const totalPages = ownQuestionData.pagination?.totalPages ?? 1;
            if (ownPage >= totalPages) break;
            ownPage += 1;
          }
        } else if (user.role === 'teacher') {
          // 修改原因：按需求开放老师打印“所有孩子题目”，复用现有列表接口并按作者角色筛选学生题目。
          let page = 1;
          while (true) {
            // eslint-disable-next-line no-await-in-loop
            const pageData = await questionService.getQuestions({
              page,
              pageSize: 100,
              status: 'approved'
            });
            const list = Array.isArray(pageData.list) ? pageData.list : [];

            // ⚠️ 不确定因素：若后端未来不再返回 authorRole，这里会筛掉全部数据；届时需改为后端专用接口筛选。
            list
              .filter((question) => question.authorRole === 'student')
              .forEach((question) => {
                const existing = favoriteMap.get(question.id);
                if (existing) {
                  existing.fromChildren = true;
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
                    childNames: [],
                  });
                }
              });

            const totalPages = pageData.pagination?.totalPages ?? 1;
            if (page >= totalPages) break;
            page += 1;
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
    // 修改原因：返回行为改为业务显式目标，避免“选题页 <-> 预览页”在 history 回退下反复横跳。
    try {
      const returnTo = sessionStorage.getItem(SESSION_RETURN_TO_KEY);
      navigate(returnTo || '/profile');
    } catch {
      // ⚠️ 不确定因素：若 sessionStorage 不可用，回退目标会降级为 /profile。
      navigate('/profile');
    }
  };

  const goPrint = () => {
    if (selectedIds.size === 0) {
      toast.error('请先勾选至少1道题');
      return;
    }

    try {
      sessionStorage.setItem(SESSION_SELECTED_IDS_KEY, JSON.stringify(Array.from(selectedIds)));

      // 修改原因：按角色提供更贴近场景的默认 PDF 文件名。
      const selectedCandidates = candidates.filter((item) => selectedIds.has(item.id));
      let baseName = '打印题目';
      if (user?.role === 'parent') {
        const uniqueChildNames = Array.from(
          new Set(selectedCandidates.flatMap((item) => item.childNames).filter(Boolean))
        );
        baseName =
          uniqueChildNames.length === 0
            ? '孩子题目'
            : uniqueChildNames.length === 1
              ? uniqueChildNames[0]
              : `${uniqueChildNames[0]}等${uniqueChildNames.length}位孩子`;
      } else if (user?.role === 'student') {
        baseName = '我的提问';
      } else if (user?.role === 'teacher') {
        baseName = '孩子题目';
      }

      const fileName = `${baseName}_${formatFileTimestamp()}`;
      sessionStorage.setItem(SESSION_FILENAME_KEY, fileName);
    } catch {
      // ⚠️ 不确定因素：极端隐私模式可能禁用 sessionStorage；当前仅提示用户重试，避免引入复杂回退方案。
      toast.error('暂存打印题目失败，请检查浏览器设置');
      return;
    }

    navigate('/print/questions/view');
  };

  if (!user || (user.role !== 'parent' && user.role !== 'student' && user.role !== 'teacher')) {
    return null;
  }

  const roleQuestionLabel = user.role === 'student' ? '我的提问' : '孩子题目';

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
          {/* 修改原因：主流程已由浏览器打印切换为 PDF 导出，按钮文案同步。 */}
          去导出（{selectedIds.size}）
        </Button>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
        <p className="text-sm text-gray-700 font-medium">用途说明</p>
        {/* 修改原因：打印流程已改为服务端生成 PDF，避免继续提示“浏览器原生打印”。 */}
        <p className="text-xs text-gray-500">
          {user.role === 'student'
            ? '可从“我的收藏 + 我的提问”中勾选，进入打印页后一键导出 PDF。'
            : '可从“我的收藏 + 孩子全部题目”中勾选，进入打印页后一键导出 PDF。'}
        </p>
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
          {roleQuestionLabel}
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
              ? `收藏 + ${roleQuestionLabel}`
              : item.fromFavorites
                ? '收藏'
                : roleQuestionLabel;
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
