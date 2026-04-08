/**
 * [POS] src/components/ui/error-message.tsx
 *   所属：components/ui 层 | 角色：表单字段错误消息显示组件
 *   兄弟：alert.tsx, form.tsx
 *
 * [INPUT]
 *   - react                  → React
 *   - @/lib/utils            → cn（样式合并）
 *
 * [OUTPUT]
 *   - ErrorMessage           → 错误消息显示组件
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化）
 *   2. src/components/ui/CLAUDE.md 的文件清单
 */
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ErrorMessageProps extends React.HTMLAttributes<HTMLParagraphElement> {
  /**
   * 错误消息内容
   */
  children?: React.ReactNode;
  /**
   * 是否显示错误图标
   */
  showIcon?: boolean;
}

/**
 * 表单字段错误消息组件
 * 
 * 用于在表单字段旁显示验证错误信息
 * 
 * @example
 * ```tsx
 * <div>
 *   <Input {...field} />
 *   {fieldErrors.title && (
 *     <ErrorMessage>{fieldErrors.title}</ErrorMessage>
 *   )}
 * </div>
 * ```
 */
export const ErrorMessage = React.forwardRef<HTMLParagraphElement, ErrorMessageProps>(
  ({ className, children, showIcon = true, ...props }, ref) => {
    if (!children) return null;

    return (
      <p
        ref={ref}
        className={cn(
          'text-sm font-medium text-destructive flex items-start gap-1.5 mt-1.5',
          className
        )}
        {...props}
      >
        {showIcon && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4 mt-0.5 flex-shrink-0"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
        )}
        <span>{children}</span>
      </p>
    );
  }
);

ErrorMessage.displayName = 'ErrorMessage';
