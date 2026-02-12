import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoodQuestionBadge } from '@/components/ui/good-question-badge';
import { BrowserRouter } from 'react-router-dom';
import { api } from '@/services/api';
import { featureFlags } from '@/config/feature-flags';

// Mock navigation
const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockedNavigate,
    };
});

// Mock API
vi.mock('@/services/api', () => ({
    api: {
        post: vi.fn(),
    },
}));

// Mock Feature Flags
vi.mock('@/config/feature-flags', () => ({
    featureFlags: {
        ENABLE_GOOD_QUESTION_INTERACTION: true,
    },
}));

describe('GoodQuestionBadge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset feature flag
        featureFlags.ENABLE_GOOD_QUESTION_INTERACTION = true;
    });

    it('renders correctly', () => {
        render(
            <BrowserRouter>
                <GoodQuestionBadge />
            </BrowserRouter>
        );
        expect(screen.getByText('好问题')).toBeInTheDocument();
    });

    it('navigates and logs on click when enabled', async () => {
        (api.post as any).mockResolvedValueOnce({ data: { success: true } });

        render(
            <BrowserRouter>
                <GoodQuestionBadge />
            </BrowserRouter>
        );

        const badge = screen.getByText('好问题');
        fireEvent.click(badge);

        expect(screen.getByText('跳转中...')).toBeInTheDocument();
        
        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/behavior/log', expect.objectContaining({
                type: 'click_good_question'
            }));
        });

        await waitFor(() => {
            expect(mockedNavigate).toHaveBeenCalledWith('/good-questions');
        });
    });

    it('does not navigate if disabled', () => {
        // Disable feature flag
        featureFlags.ENABLE_GOOD_QUESTION_INTERACTION = false;

        render(
            <BrowserRouter>
                <GoodQuestionBadge />
            </BrowserRouter>
        );

        const badge = screen.getByText('好问题');
        fireEvent.click(badge);

        expect(api.post).not.toHaveBeenCalled();
        expect(mockedNavigate).not.toHaveBeenCalled();
    });

    it('handles API error gracefully', async () => {
        (api.post as any).mockRejectedValueOnce(new Error('Network error'));

        render(
            <BrowserRouter>
                <GoodQuestionBadge />
            </BrowserRouter>
        );

        const badge = screen.getByText('好问题');
        fireEvent.click(badge);

        await waitFor(() => {
            expect(api.post).toHaveBeenCalled();
        });

        // Should revert back to normal text
        await waitFor(() => {
            expect(screen.getByText('好问题')).toBeInTheDocument();
        });
    });
});
