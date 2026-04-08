import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GoodQuestionBadge } from '@/components/ui/good-question-badge';

describe('GoodQuestionBadge', () => {
    it('renders correctly as non-interactive badge', () => {
        render(<GoodQuestionBadge />);
        expect(screen.getByText('好问题')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
        render(<GoodQuestionBadge className="custom-class" />);
        const badge = screen.getByTestId('good-question-badge');
        expect(badge.className).toContain('custom-class');
    });
});
