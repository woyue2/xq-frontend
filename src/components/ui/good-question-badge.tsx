import React from 'react';
import { Badge } from '@/components/ui/badge';
import { UI_CONFIG } from '@/config/ui-config';

interface GoodQuestionBadgeProps {
    className?: string;
    showIcon?: boolean;
}

/**
 * GoodQuestionBadge
 * 
 * Displays the "Good Question" badge as a non-interactive label.
 * Navigation to good questions list has been removed in app simplification.
 */
export function GoodQuestionBadge({ className, showIcon = false }: GoodQuestionBadgeProps) {
    return (
        <Badge 
            className={`
                ${UI_CONFIG.colors.goodQuestion} 
                ${className || ''}
            `}
            data-testid="good-question-badge"
        >
            好问题
        </Badge>
    );
}
