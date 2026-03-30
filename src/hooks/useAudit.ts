/**
 * [POS] src/hooks/useAudit.ts
 *   所属：hooks 层 | 角色：审核页面全量 state + API 交互逻辑
 *   兄弟：useAdminWhitelist.ts（同 hooks 层）
 *
 * [INPUT]
 *   - react                  → useState / useEffect
 *   - sonner                 → toast
 *   - @/services/api         → auditService
 *   - @/types                → Question / Comment / AuditStatus
 *
 * [OUTPUT]
 *   - useAudit（hook）→ 审核列表 state、过滤、dialog handler、审核 action
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/hooks/CLAUDE.md 的文件清单
 */
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { auditService } from '@/services/api';
import type { Question, Comment, AuditStatus } from '@/types';

type ActiveTab = 'questions' | 'comments';
type RejectTargetType = 'question' | 'comment';

interface RejectTarget {
  id: string;
  type: RejectTargetType;
}

export function useAudit() {
  // ── Tab & 过滤
  const [activeTab, setActiveTab] = useState<ActiveTab>('questions');
  const [filter, setFilter] = useState<AuditStatus>('pending');

  // ── 数据
  const [questions, setQuestions] = useState<Question[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

  // ── 驳回 dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // ── 打分 dialog
  const [scoreDialogOpen, setScoreDialogOpen] = useState(false);
  const [scoreTargetId, setScoreTargetId] = useState<string | null>(null);
  const [currentScore, setCurrentScore] = useState(0);

  // ── 图片预览
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // ── 加载问题列表
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoadingQuestions(true);
        const res = await auditService.getPendingQuestions({ page: 1, pageSize: 50 });
        if (!cancelled && res?.list) {
          setQuestions(res.list as unknown as Question[]);
        }
      } catch {
        if (!cancelled) toast.error('加载审核问题失败');
      } finally {
        if (!cancelled) setLoadingQuestions(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // ── 加载评论列表
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoadingComments(true);
        const res = await auditService.getPendingComments({ page: 1, pageSize: 50 });
        if (!cancelled && res?.list) {
          setComments(res.list as unknown as Comment[]);
        }
      } catch {
        if (!cancelled) toast.error('加载审核评论失败');
      } finally {
        if (!cancelled) setLoadingComments(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // ── 派生：按 filter 过滤
  const filteredQuestions = questions.filter((q) => {
    if (filter === 'pending') return (q as any).status === 'pending';
    if (filter === 'approved') return (q as any).status === 'approved';
    if (filter === 'rejected') return (q as any).status === 'rejected';
    return true;
  });

  const filteredComments = comments.filter((c) => {
    if (filter === 'pending') return (c as any).status === 'pending';
    if (filter === 'approved') return (c as any).status === 'approved';
    if (filter === 'rejected') return (c as any).status === 'rejected';
    return true;
  });

  // ── 统计待审核数量
  const pendingQuestionsCount = questions.filter((q) => (q as any).status === 'pending').length;
  const pendingCommentsCount = comments.filter((c) => (c as any).status === 'pending').length;

  // ── 前端乐观更新：将某条内容的 status 改为目标状态
  const handleAudit = (id: string, type: 'question' | 'comment', status: AuditStatus) => {
    if (type === 'question') {
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? { ...q, status } : q))
      );
    } else {
      setComments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status } : c))
      );
    }
  };

  // ── 驳回 dialog 开关
  const openRejectDialog = (id: string, type: RejectTargetType) => {
    setRejectTarget({ id, type });
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    try {
      if (rejectTarget.type === 'question') {
        await auditService.rejectQuestion(rejectTarget.id, rejectReason);
        handleAudit(rejectTarget.id, 'question', 'rejected');
        toast.success('已驳回问题');
      } else {
        await auditService.banComment(rejectTarget.id, rejectReason);
        handleAudit(rejectTarget.id, 'comment', 'rejected');
        toast.success('已封禁评论');
      }
    } catch {
      // 错误由 axios 拦截器处理
    } finally {
      setRejectDialogOpen(false);
      setRejectTarget(null);
    }
  };

  // ── 打分 dialog 开关
  const [_scoreDialogOpen, _setScoreDialogOpen] = useState(false);

  const openScoreDialog = (id: string) => {
    const q = questions.find((q) => q.id === id);
    setScoreTargetId(id);
    setCurrentScore((q as any)?.score ?? 0);
    _setScoreDialogOpen(true);
  };

  const confirmScore = async () => {
    if (!scoreTargetId) return;
    try {
      await auditService.approveQuestion(scoreTargetId, { score: currentScore });
      setQuestions((prev) =>
        prev.map((q) => (q.id === scoreTargetId ? { ...q, score: currentScore } : q))
      );
      toast.success('评分已保存');
    } catch {
      // 错误由拦截器处理
    } finally {
      _setScoreDialogOpen(false);
      setScoreTargetId(null);
    }
  };

  // ── 好问题切换
  const toggleGoodQuestion = async (id: string, checked: boolean) => {
    try {
      await auditService.approveQuestion(id, { isGoodQuestion: checked });
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? { ...q, isGoodQuestion: checked } : q))
      );
    } catch {
      toast.error('操作失败，请重试');
    }
  };

  return {
    // tab & filter
    activeTab,
    setActiveTab,
    filter,
    setFilter,
    // 数据
    filteredQuestions,
    filteredComments,
    pendingQuestionsCount,
    pendingCommentsCount,
    loadingQuestions,
    loadingComments,
    // 驳回 dialog
    rejectDialogOpen,
    setRejectDialogOpen,
    rejectReason,
    setRejectReason,
    // 打分 dialog
    scoreDialogOpen: _scoreDialogOpen,
    setScoreDialogOpen: _setScoreDialogOpen,
    currentScore,
    setCurrentScore,
    // 图片预览
    selectedImage,
    setSelectedImage,
    // actions
    handleAudit,
    openRejectDialog,
    confirmReject,
    openScoreDialog,
    confirmScore,
    toggleGoodQuestion,
  };
}
