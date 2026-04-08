/**
 * QuestionDetail 组件测试
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuestionDetail } from '../components/QuestionDetail';
import type { QuestionDTO, AnswerDTO, CommentDTO } from '../types/dto';

// Mock data
const mockQuestion: QuestionDTO = {
  id: 'q1',
  title: '测试问题标题',
  content: '测试问题内容',
  subject: '数学',
  tags: ['代数', '方程'],
  images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
  authorId: 'user1',
  authorName: '张三',
  authorAvatar: 'https://example.com/avatar1.jpg',
  createdAt: new Date('2024-01-15T10:00:00Z').toISOString(),
  updatedAt: new Date('2024-01-15T10:00:00Z').toISOString(),
  answerCount: 2
};

const mockAnswers: AnswerDTO[] = [
  {
    id: 'a1',
    questionId: 'q1',
    content: '这是第一个回答',
    images: ['https://example.com/answer1.jpg'],
    authorId: 'user2',
    authorName: '李四',
    authorAvatar: 'https://example.com/avatar2.jpg',
    createdAt: new Date('2024-01-15T11:00:00Z').toISOString(),
    updatedAt: new Date('2024-01-15T11:00:00Z').toISOString()
  },
  {
    id: 'a2',
    questionId: 'q1',
    content: '这是第二个回答',
    authorId: 'user3',
    authorName: '王五',
    createdAt: new Date('2024-01-15T12:00:00Z').toISOString(),
    updatedAt: new Date('2024-01-15T12:00:00Z').toISOString()
  }
];

const mockComments: CommentDTO[] = [
  {
    id: 'c1',
    questionId: 'q1',
    content: '这是第一条评论',
    authorId: 'user4',
    authorName: '赵六',
    authorAvatar: 'https://example.com/avatar4.jpg',
    createdAt: new Date('2024-01-15T13:00:00Z').toISOString(),
    updatedAt: new Date('2024-01-15T13:00:00Z').toISOString()
  },
  {
    id: 'c2',
    questionId: 'q1',
    content: '这是第二条评论',
    image: 'https://example.com/comment1.jpg',
    authorId: 'user5',
    authorName: '孙七',
    createdAt: new Date('2024-01-15T14:00:00Z').toISOString(),
    updatedAt: new Date('2024-01-15T14:00:00Z').toISOString()
  }
];

describe('QuestionDetail', () => {
  it('renders question title and content', () => {
    render(<QuestionDetail question={mockQuestion} />);
    
    expect(screen.getByText('测试问题标题')).toBeInTheDocument();
    expect(screen.getByText('测试问题内容')).toBeInTheDocument();
  });

  it('renders subject badge', () => {
    render(<QuestionDetail question={mockQuestion} />);
    
    expect(screen.getByText('数学')).toBeInTheDocument();
  });

  it('renders tags', () => {
    render(<QuestionDetail question={mockQuestion} />);
    
    expect(screen.getByText('代数')).toBeInTheDocument();
    expect(screen.getByText('方程')).toBeInTheDocument();
  });

  it('renders author information', () => {
    render(<QuestionDetail question={mockQuestion} />);
    
    expect(screen.getByText('张三')).toBeInTheDocument();
  });

  it('does not render action buttons when not logged in', () => {
    render(<QuestionDetail question={mockQuestion} isLoggedIn={false} />);
    
    expect(screen.queryByText('回答')).not.toBeInTheDocument();
    expect(screen.queryByText('评论')).not.toBeInTheDocument();
  });

  it('renders action buttons when logged in', () => {
    render(<QuestionDetail question={mockQuestion} isLoggedIn={true} />);
    
    expect(screen.getByText('回答')).toBeInTheDocument();
    expect(screen.getByText('评论')).toBeInTheDocument();
  });

  it('calls onAnswer when answer button is clicked', () => {
    const onAnswer = vi.fn();
    render(
      <QuestionDetail
        question={mockQuestion}
        isLoggedIn={true}
        onAnswer={onAnswer}
      />
    );
    
    const answerButton = screen.getByText('回答');
    fireEvent.click(answerButton);
    
    expect(onAnswer).toHaveBeenCalledTimes(1);
  });

  it('calls onComment when comment button is clicked', () => {
    const onComment = vi.fn();
    render(
      <QuestionDetail
        question={mockQuestion}
        isLoggedIn={true}
        onComment={onComment}
      />
    );
    
    const commentButton = screen.getByText('评论');
    fireEvent.click(commentButton);
    
    expect(onComment).toHaveBeenCalledTimes(1);
  });

  it('renders answers section with correct count', () => {
    render(
      <QuestionDetail
        question={mockQuestion}
        answers={mockAnswers}
      />
    );
    
    expect(screen.getByText('回答 (2)')).toBeInTheDocument();
    expect(screen.getByText('这是第一个回答')).toBeInTheDocument();
    expect(screen.getByText('这是第二个回答')).toBeInTheDocument();
  });

  it('renders answer author information', () => {
    render(
      <QuestionDetail
        question={mockQuestion}
        answers={mockAnswers}
      />
    );
    
    expect(screen.getByText('李四')).toBeInTheDocument();
    expect(screen.getByText('王五')).toBeInTheDocument();
  });

  it('renders comments section with correct count', () => {
    render(
      <QuestionDetail
        question={mockQuestion}
        comments={mockComments}
      />
    );
    
    expect(screen.getByText('评论 (2)')).toBeInTheDocument();
    expect(screen.getByText('这是第一条评论')).toBeInTheDocument();
    expect(screen.getByText('这是第二条评论')).toBeInTheDocument();
  });

  it('renders comment author information', () => {
    render(
      <QuestionDetail
        question={mockQuestion}
        comments={mockComments}
      />
    );
    
    expect(screen.getByText('赵六')).toBeInTheDocument();
    expect(screen.getByText('孙七')).toBeInTheDocument();
  });

  it('does not render answers section when no answers', () => {
    render(
      <QuestionDetail
        question={mockQuestion}
        answers={[]}
      />
    );
    
    expect(screen.queryByText(/回答 \(/)).not.toBeInTheDocument();
  });

  it('does not render comments section when no comments', () => {
    render(
      <QuestionDetail
        question={mockQuestion}
        comments={[]}
      />
    );
    
    expect(screen.queryByText(/评论 \(/)).not.toBeInTheDocument();
  });

  it('renders question without optional fields', () => {
    const minimalQuestion: QuestionDTO = {
      id: 'q2',
      title: '最小问题',
      authorId: 'user1',
      authorName: '张三',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    render(<QuestionDetail question={minimalQuestion} />);
    
    expect(screen.getByText('最小问题')).toBeInTheDocument();
    expect(screen.getByText('张三')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <QuestionDetail
        question={mockQuestion}
        className="custom-class"
      />
    );
    
    const element = container.querySelector('.custom-class');
    expect(element).toBeInTheDocument();
  });

  it('renders all answers and comments together', () => {
    render(
      <QuestionDetail
        question={mockQuestion}
        answers={mockAnswers}
        comments={mockComments}
      />
    );
    
    // Check question
    expect(screen.getByText('测试问题标题')).toBeInTheDocument();
    
    // Check answers
    expect(screen.getByText('回答 (2)')).toBeInTheDocument();
    expect(screen.getByText('这是第一个回答')).toBeInTheDocument();
    
    // Check comments
    expect(screen.getByText('评论 (2)')).toBeInTheDocument();
    expect(screen.getByText('这是第一条评论')).toBeInTheDocument();
  });
});
