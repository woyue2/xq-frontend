import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QuestionCard } from '@/components/QuestionCard';

describe('QuestionCard stats boundaries', () => {
  it('renders 0 counts when stats fields are missing or undefined', () => {
    const question: any = {
      id: 'q1',
      title: 'Stats Edge Case Question',
      content: 'Content',
      subject: 'math',
      topics: [],
      images: [],
      status: 'approved',
      isPinned: false,
      isGoodQuestion: false,
      tags: [],
      stats: {}, // likes/favorites/comments 未提供
      authorId: 'u1',
      authorName: 'Author',
      createdAt: new Date().toISOString(),
    };

    render(
      <MemoryRouter>
        <QuestionCard question={question} />
      </MemoryRouter>
    );

    // QuestionCard 中依次渲染点赞数、收藏数、评论数，均应安全回退为 0
    const counters = screen.getAllByText('0');
    expect(counters.length).toBeGreaterThanOrEqual(3);
  });
});

