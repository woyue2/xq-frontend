import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { UI_CONFIG } from '@/config/ui-config';
import { featureFlags } from '@/config/feature-flags';
import { api } from '@/services/api';
import { toast } from 'sonner'; // Assuming sonner is used based on package.json

interface GoodQuestionBadgeProps {
    className?: string;
    showIcon?: boolean;
}

/**
 * GoodQuestionBadge
 * 
 * Displays the "Good Question" badge.
 * If feature flag is enabled, clicking it navigates to the Good Questions list
 * and logs the interaction to the backend.
 */
export function GoodQuestionBadge({ className, showIcon = false }: GoodQuestionBadgeProps) {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const isInteractive = featureFlags.ENABLE_GOOD_QUESTION_INTERACTION;

    const handleClick = async (e: React.MouseEvent) => {
        if (!isInteractive || isLoading) return;
        
        e.stopPropagation(); // Prevent triggering parent card clicks
        setIsLoading(true);

        try {
            // Simulate backend logging
            await api.post('/behavior/log', {
                type: 'click_good_question',
                timestamp: Date.now()
            });
            
            navigate('/good-questions');
        } catch (error) {
            console.error('Failed to log click:', error);
            // Even if logging fails, we should probably still navigate or show error?
            // User requirement: "ensure user can perceive and recover when network exception"
            // So we show a toast and maybe allow retry (which is just clicking again).
            toast.error('网络不稳定，请稍后再试');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Badge 
            className={`
                ${UI_CONFIG.colors.goodQuestion} 
                ${className || ''} 
                ${isInteractive ? 'cursor-pointer hover:opacity-90 active:scale-95 transition-all' : ''}
                ${isLoading ? 'opacity-70 cursor-wait' : ''}
            `}
            onClick={handleClick}
            data-testid="good-question-badge"
        >
            {isLoading ? '跳转中...' : '好问题'}
        </Badge>
    );
}
