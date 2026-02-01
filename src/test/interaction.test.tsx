import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GoodQuestionBadge } from '@/components/ui/good-question-badge';
import { api } from '@/services/api';
import { featureFlags } from '@/config/feature-flags';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useNavigate } from 'react-router-dom';

// Mock dependencies
vi.mock('react-router-dom', () => ({
    useNavigate: vi.fn(),
}));

vi.mock('@/services/api', () => ({
    api: {
        post: vi.fn(),
    },
}));

vi.mock('@/config/feature-flags', () => ({
    featureFlags: {
        ENABLE_GOOD_QUESTION_INTERACTION: true,
    },
}));

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
    },
}));

import { QuestionCard } from '@/components/QuestionCard';

describe('GoodQuestionBadge Interaction', () => {
    const mockNavigate = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useNavigate as any).mockReturnValue(mockNavigate);
        (api.post as any).mockResolvedValue({ data: { success: true } });
    });

    it('should render the badge correctly', () => {
        render(<GoodQuestionBadge />);
        expect(screen.getByText('好问题')).toBeInTheDocument();
    });

    it('should navigate to good questions page and log event on click when feature is enabled', async () => {
        render(<GoodQuestionBadge />);
        
        const badge = screen.getByText('好问题');
        fireEvent.click(badge);

        // Verify loading state (optional, might be too fast)
        // expect(screen.getByText('跳转中...')).toBeInTheDocument();

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/behavior/log', expect.objectContaining({
                type: 'click_good_question'
            }));
            expect(mockNavigate).toHaveBeenCalledWith('/good-questions');
        });
    });

    it('should show loading state during request', async () => {
        // Delay the response
        (api.post as any).mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
        
        render(<GoodQuestionBadge />);
        const badge = screen.getByText('好问题');
        
        fireEvent.click(badge);
        
        expect(screen.getByText('跳转中...')).toBeInTheDocument();
        
        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/good-questions');
        });
    });

    it('should handle API errors gracefully', async () => {
        const { toast } = await import('sonner');
        (api.post as any).mockRejectedValue(new Error('Network error'));
        
        render(<GoodQuestionBadge />);
        const badge = screen.getByText('好问题');
        
        fireEvent.click(badge);
        
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('网络请求失败，请重试');
            // Should NOT navigate on error (based on current implementation logic in GoodQuestionBadge.tsx)
            expect(mockNavigate).not.toHaveBeenCalled();
        });
    });
});

describe('QuestionCard Integration', () => {
    const mockNavigate = vi.fn();
    
    // Mock data for QuestionCard
    const mockQuestion = {
        id: 'q1',
        title: 'Test Question',
        authorName: 'Test Author',
        createdAt: new Date().toISOString(),
        difficulty: 'easy',
        isGoodQuestion: true,
        isPinned: false,
        stats: { likes: 10, favorites: 5, comments: 2 },
        tags: ['Math'],
        topics: ['Algebra'],
        subject: 'math',
        images: []
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (useNavigate as any).mockReturnValue(mockNavigate);
        (api.post as any).mockResolvedValue({ data: { success: true } });
    });

    it('should navigate to question detail when card is clicked', () => {
        render(<QuestionCard question={mockQuestion as any} />);
        
        fireEvent.click(screen.getByText('Test Question'));
        
        expect(mockNavigate).toHaveBeenCalledWith('/question/q1');
    });

    it('should navigate to good questions page when badge is clicked inside card', async () => {
        render(<QuestionCard question={mockQuestion as any} />);
        
        const badge = screen.getByText('好问题');
        fireEvent.click(badge);
        
        // Should log and navigate to good-questions, NOT question detail
        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/behavior/log', expect.objectContaining({
                type: 'click_good_question'
            }));
            expect(mockNavigate).toHaveBeenCalledWith('/good-questions');
            expect(mockNavigate).not.toHaveBeenCalledWith('/question/q1');
        });
    });
});
