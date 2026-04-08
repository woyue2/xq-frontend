/**
 * [POS] src/test/CommentCard.test.tsx
 *   所属：test 层 | 角色：CommentCard 组件单元测试
 *   用途：验证 CommentCard 组件的渲染和功能
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CommentCard } from '@/components/CommentCard';
import type { CommentDTO } from '@/types/dto';

describe('CommentCard', () => {
  const mockComment: CommentDTO = {
    id: '1',
    questionId: 'q1',
    content: '这是一个测试评论',
    authorId: 'user1',
    authorName: '测试用户',
    authorAvatar: '/test-avatar.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  it('should render comment content', () => {
    render(<CommentCard comment={mockComment} />);
    expect(screen.getByText('这是一个测试评论')).toBeInTheDocument();
  });

  it('should render author name', () => {
    render(<CommentCard comment={mockComment} />);
    expect(screen.getByText('测试用户')).toBeInTheDocument();
  });

  it('should render author avatar container', () => {
    const { container } = render(<CommentCard comment={mockComment} />);
    const avatar = container.querySelector('[data-slot="avatar"]');
    expect(avatar).toBeInTheDocument();
  });

  it('should render avatar fallback when no avatar provided', () => {
    const commentWithoutAvatar: CommentDTO = {
      ...mockComment,
      authorAvatar: undefined
    };
    render(<CommentCard comment={commentWithoutAvatar} />);
    expect(screen.getByText('测')).toBeInTheDocument(); // First character of name
  });

  it('should render time as "刚刚" for recent comments', () => {
    render(<CommentCard comment={mockComment} />);
    expect(screen.getByText('刚刚')).toBeInTheDocument();
  });

  it('should render time as "X分钟前" for comments within an hour', () => {
    const commentMinutesAgo: CommentDTO = {
      ...mockComment,
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 minutes ago
    };
    render(<CommentCard comment={commentMinutesAgo} />);
    expect(screen.getByText(/\d+分钟前/)).toBeInTheDocument();
  });

  it('should render time as "X小时前" for comments within a day', () => {
    const commentHoursAgo: CommentDTO = {
      ...mockComment,
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() // 5 hours ago
    };
    render(<CommentCard comment={commentHoursAgo} />);
    expect(screen.getByText(/\d+小时前/)).toBeInTheDocument();
  });

  it('should render date for comments older than a day', () => {
    const commentDaysAgo: CommentDTO = {
      ...mockComment,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
    };
    render(<CommentCard comment={commentDaysAgo} />);
    const timeElement = screen.getByText(/\d{4}\/\d{1,2}\/\d{1,2}|\d{1,2}\/\d{1,2}\/\d{4}/);
    expect(timeElement).toBeInTheDocument();
  });

  it('should not render image when no image provided', () => {
    const { container } = render(<CommentCard comment={mockComment} />);
    const image = container.querySelector('img');
    expect(image).not.toBeInTheDocument();
  });

  it('should render single image when image is provided', () => {
    const commentWithImage: CommentDTO = {
      ...mockComment,
      image: 'comment-image.jpg'
    };
    render(<CommentCard comment={commentWithImage} />);
    const image = screen.getByAltText('评论图片');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'comment-image.jpg');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <CommentCard comment={mockComment} className="custom-class" />
    );
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('custom-class');
  });

  it('should preserve whitespace in content', () => {
    const multilineComment: CommentDTO = {
      ...mockComment,
      content: '第一行\n第二行\n第三行'
    };
    const { container } = render(<CommentCard comment={multilineComment} />);
    const contentDiv = container.querySelector('.whitespace-pre-wrap');
    expect(contentDiv).toBeInTheDocument();
    expect(contentDiv?.textContent).toBe('第一行\n第二行\n第三行');
  });

  it('should have correct base styling', () => {
    const { container } = render(<CommentCard comment={mockComment} />);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('bg-white', 'rounded-lg', 'p-4', 'shadow-sm');
  });

  it('should render image with correct styling', () => {
    const commentWithImage: CommentDTO = {
      ...mockComment,
      image: 'test-image.jpg'
    };
    const { container } = render(<CommentCard comment={commentWithImage} />);
    const image = container.querySelector('img');
    expect(image).toHaveClass('rounded-lg', 'max-w-full', 'h-auto');
  });
});
