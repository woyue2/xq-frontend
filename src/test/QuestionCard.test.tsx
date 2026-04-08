/**
 * Unit tests for QuestionCard component
 * Tests basic rendering and navigation functionality
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QuestionCard } from '@/components/QuestionCard';
import type { QuestionDTO } from '@/types/dto';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('QuestionCard', () => {
  const mockQuestion: QuestionDTO = {
    id: 'q1',
    title: 'Test Question Title',
    content: 'Test question content',
    subject: 'math',
    tags: ['algebra', 'equations'],
    images: ['https://example.com/image1.jpg'],
    authorId: 'u1',
    authorName: 'Test Author',
    authorAvatar: 'https://example.com/avatar.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    answerCount: 5,
  };

  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders question title', () => {
    render(
      <MemoryRouter>
        <QuestionCard question={mockQuestion} />
      </MemoryRouter>
    );

    expect(screen.getByText('Test Question Title')).toBeInTheDocument();
  });

  it('renders subject badge', () => {
    render(
      <MemoryRouter>
        <QuestionCard question={mockQuestion} />
      </MemoryRouter>
    );

    expect(screen.getByText('math')).toBeInTheDocument();
  });

  it('renders tags', () => {
    render(
      <MemoryRouter>
        <QuestionCard question={mockQuestion} />
      </MemoryRouter>
    );

    expect(screen.getByText('algebra')).toBeInTheDocument();
    expect(screen.getByText('equations')).toBeInTheDocument();
  });

  it('renders author name', () => {
    render(
      <MemoryRouter>
        <QuestionCard question={mockQuestion} />
      </MemoryRouter>
    );

    expect(screen.getByText('Test Author')).toBeInTheDocument();
  });

  it('navigates to question detail page when clicked', () => {
    render(
      <MemoryRouter>
        <QuestionCard question={mockQuestion} />
      </MemoryRouter>
    );

    const card = screen.getByText('Test Question Title').closest('div');
    if (card) {
      fireEvent.click(card);
      expect(mockNavigate).toHaveBeenCalledWith('/question/q1');
    }
  });

  it('renders without images when images array is empty', () => {
    const questionWithoutImages = { ...mockQuestion, images: [] };
    render(
      <MemoryRouter>
        <QuestionCard question={questionWithoutImages} />
      </MemoryRouter>
    );

    expect(screen.getByText('Test Question Title')).toBeInTheDocument();
  });

  it('renders without subject when subject is undefined', () => {
    const questionWithoutSubject = { ...mockQuestion, subject: undefined };
    render(
      <MemoryRouter>
        <QuestionCard question={questionWithoutSubject} />
      </MemoryRouter>
    );

    expect(screen.getByText('Test Question Title')).toBeInTheDocument();
    expect(screen.queryByText('math')).not.toBeInTheDocument();
  });

  it('renders without tags when tags array is empty', () => {
    const questionWithoutTags = { ...mockQuestion, tags: [] };
    render(
      <MemoryRouter>
        <QuestionCard question={questionWithoutTags} />
      </MemoryRouter>
    );

    expect(screen.getByText('Test Question Title')).toBeInTheDocument();
    expect(screen.queryByText('algebra')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <MemoryRouter>
        <QuestionCard question={mockQuestion} className="custom-class" />
      </MemoryRouter>
    );

    const card = container.querySelector('.custom-class');
    expect(card).toBeInTheDocument();
  });
});
