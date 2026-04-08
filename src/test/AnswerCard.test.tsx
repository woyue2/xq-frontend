/**
 * [POS] src/test/AnswerCard.test.tsx
 *   所属：test 层 | 角色：AnswerCard 组件单元测试
 *   用途：验证 AnswerCard 组件的渲染和功能
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnswerCard } from '@/components/AnswerCard';
import type { AnswerDTO } from '@/types/dto';

describe('AnswerCard', () => {
  const mockAnswer: AnswerDTO = {
    id: '1',
    questionId: 'q1',
    content: '这是一个测试回答',
    authorId: 'user1',
    authorName: '测试用户',
    authorAvatar: '/test-avatar.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  it('should render answer content', () => {
    render(<AnswerCard answer={mockAnswer} />);
    expect(screen.getByText('这是一个测试回答')).toBeInTheDocument();
  });

  it('should render author name', () => {
    render(<AnswerCard answer={mockAnswer} />);
    expect(screen.getByText('测试用户')).toBeInTheDocument();
  });

  it('should render author avatar container', () => {
    const { container } = render(<AnswerCard answer={mockAnswer} />);
    const avatar = container.querySelector('[data-slot="avatar"]');
    expect(avatar).toBeInTheDocument();
  });

  it('should render avatar fallback when no avatar provided', () => {
    const answerWithoutAvatar: AnswerDTO = {
      ...mockAnswer,
      authorAvatar: undefined
    };
    render(<AnswerCard answer={answerWithoutAvatar} />);
    expect(screen.getByText('测')).toBeInTheDocument(); // First character of name
  });

  it('should render time as "刚刚" for recent answers', () => {
    render(<AnswerCard answer={mockAnswer} />);
    expect(screen.getByText('刚刚')).toBeInTheDocument();
  });

  it('should render time as "X分钟前" for answers within an hour', () => {
    const answerMinutesAgo: AnswerDTO = {
      ...mockAnswer,
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 minutes ago
    };
    render(<AnswerCard answer={answerMinutesAgo} />);
    expect(screen.getByText(/\d+分钟前/)).toBeInTheDocument();
  });

  it('should render time as "X小时前" for answers within a day', () => {
    const answerHoursAgo: AnswerDTO = {
      ...mockAnswer,
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() // 5 hours ago
    };
    render(<AnswerCard answer={answerHoursAgo} />);
    expect(screen.getByText(/\d+小时前/)).toBeInTheDocument();
  });

  it('should render date for answers older than a day', () => {
    const answerDaysAgo: AnswerDTO = {
      ...mockAnswer,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
    };
    render(<AnswerCard answer={answerDaysAgo} />);
    const timeElement = screen.getByText(/\d{4}\/\d{1,2}\/\d{1,2}|\d{1,2}\/\d{1,2}\/\d{4}/);
    expect(timeElement).toBeInTheDocument();
  });

  it('should not render ImageGallery when no images provided', () => {
    const { container } = render(<AnswerCard answer={mockAnswer} />);
    // ImageGallery should not be present
    const imageGallery = container.querySelector('.grid');
    expect(imageGallery).not.toBeInTheDocument();
  });

  it('should render ImageGallery when images are provided', () => {
    const answerWithImages: AnswerDTO = {
      ...mockAnswer,
      images: ['image1.jpg', 'image2.jpg']
    };
    const { container } = render(<AnswerCard answer={answerWithImages} />);
    // ImageGallery should be present
    const imageGallery = container.querySelector('.grid');
    expect(imageGallery).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <AnswerCard answer={mockAnswer} className="custom-class" />
    );
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('custom-class');
  });

  it('should preserve whitespace in content', () => {
    const multilineAnswer: AnswerDTO = {
      ...mockAnswer,
      content: '第一行\n第二行\n第三行'
    };
    const { container } = render(<AnswerCard answer={multilineAnswer} />);
    const contentDiv = container.querySelector('.whitespace-pre-wrap');
    expect(contentDiv).toBeInTheDocument();
    expect(contentDiv?.textContent).toBe('第一行\n第二行\n第三行');
  });

  it('should have correct base styling', () => {
    const { container } = render(<AnswerCard answer={mockAnswer} />);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('bg-white', 'rounded-lg', 'p-4', 'shadow-sm');
  });
});
