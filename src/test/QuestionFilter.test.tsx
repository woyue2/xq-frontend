/**
 * QuestionFilter 组件单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuestionFilter } from '../components/QuestionFilter';

// Mock SubjectTopicSelector component
vi.mock('../components/SubjectTopicSelector', () => ({
  SubjectTopicSelector: ({ subjectValue, topicValue, onSubjectChange, onTopicChange }: any) => (
    <div data-testid="subject-topic-selector">
      <input
        data-testid="subject-input"
        value={subjectValue || ''}
        onChange={(e) => onSubjectChange?.(e.target.value)}
      />
      <input
        data-testid="topic-input"
        value={topicValue || ''}
        onChange={(e) => onTopicChange?.(e.target.value)}
      />
    </div>
  ),
}));

describe('QuestionFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该渲染所有筛选元素', () => {
    render(<QuestionFilter />);
    
    expect(screen.getByTestId('subject-topic-selector')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('搜索问题标题或内容...')).toBeInTheDocument();
    expect(screen.getByText('应用筛选')).toBeInTheDocument();
    expect(screen.getByText('清除')).toBeInTheDocument();
  });

  it('应该显示初始筛选值', () => {
    render(
      <QuestionFilter
        subject="math"
        topic="algebra"
        search="test query"
      />
    );
    
    expect(screen.getByTestId('subject-input')).toHaveValue('math');
    expect(screen.getByTestId('topic-input')).toHaveValue('algebra');
    expect(screen.getByPlaceholderText('搜索问题标题或内容...')).toHaveValue('test query');
  });

  it('应该在点击应用筛选时触发回调', () => {
    const handleFilterChange = vi.fn();
    render(<QuestionFilter onFilterChange={handleFilterChange} />);
    
    // 设置筛选条件
    const subjectInput = screen.getByTestId('subject-input');
    const topicInput = screen.getByTestId('topic-input');
    const searchInput = screen.getByPlaceholderText('搜索问题标题或内容...');
    
    fireEvent.change(subjectInput, { target: { value: 'math' } });
    fireEvent.change(topicInput, { target: { value: 'algebra' } });
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    // 点击应用筛选
    const applyButton = screen.getByText('应用筛选');
    fireEvent.click(applyButton);
    
    expect(handleFilterChange).toHaveBeenCalledWith({
      subject: 'math',
      topic: 'algebra',
      search: 'test',
    });
  });

  it('应该在点击清除时重置所有筛选条件', () => {
    const handleFilterChange = vi.fn();
    render(
      <QuestionFilter
        subject="math"
        topic="algebra"
        search="test"
        onFilterChange={handleFilterChange}
      />
    );
    
    // 点击清除按钮
    const clearButton = screen.getByText('清除');
    fireEvent.click(clearButton);
    
    expect(handleFilterChange).toHaveBeenCalledWith({
      subject: undefined,
      topic: undefined,
      search: undefined,
    });
    
    // 验证输入框已清空
    expect(screen.getByTestId('subject-input')).toHaveValue('');
    expect(screen.getByTestId('topic-input')).toHaveValue('');
    expect(screen.getByPlaceholderText('搜索问题标题或内容...')).toHaveValue('');
  });

  it('应该在搜索框按回车时应用筛选', () => {
    const handleFilterChange = vi.fn();
    render(<QuestionFilter onFilterChange={handleFilterChange} />);
    
    const searchInput = screen.getByPlaceholderText('搜索问题标题或内容...');
    fireEvent.change(searchInput, { target: { value: 'test query' } });
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });
    
    expect(handleFilterChange).toHaveBeenCalledWith({
      subject: undefined,
      topic: undefined,
      search: 'test query',
    });
  });

  it('应该在搜索框按其他键时不触发筛选', () => {
    const handleFilterChange = vi.fn();
    render(<QuestionFilter onFilterChange={handleFilterChange} />);
    
    const searchInput = screen.getByPlaceholderText('搜索问题标题或内容...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    fireEvent.keyDown(searchInput, { key: 'a', code: 'KeyA' });
    
    expect(handleFilterChange).not.toHaveBeenCalled();
  });

  it('应该正确处理空字符串筛选条件', () => {
    const handleFilterChange = vi.fn();
    render(<QuestionFilter onFilterChange={handleFilterChange} />);
    
    // 不设置任何筛选条件，直接点击应用
    const applyButton = screen.getByText('应用筛选');
    fireEvent.click(applyButton);
    
    expect(handleFilterChange).toHaveBeenCalledWith({
      subject: undefined,
      topic: undefined,
      search: undefined,
    });
  });

  it('应该支持自定义 className', () => {
    const { container } = render(
      <QuestionFilter className="custom-class" />
    );
    
    const filterContainer = container.querySelector('.custom-class');
    expect(filterContainer).toBeInTheDocument();
  });

  it('应该在科目变化时更新本地状态', () => {
    const handleFilterChange = vi.fn();
    render(<QuestionFilter onFilterChange={handleFilterChange} />);
    
    const subjectInput = screen.getByTestId('subject-input');
    fireEvent.change(subjectInput, { target: { value: 'physics' } });
    
    // 点击应用筛选验证状态已更新
    const applyButton = screen.getByText('应用筛选');
    fireEvent.click(applyButton);
    
    expect(handleFilterChange).toHaveBeenCalledWith({
      subject: 'physics',
      topic: undefined,
      search: undefined,
    });
  });

  it('应该在考点变化时更新本地状态', () => {
    const handleFilterChange = vi.fn();
    render(<QuestionFilter onFilterChange={handleFilterChange} />);
    
    const topicInput = screen.getByTestId('topic-input');
    fireEvent.change(topicInput, { target: { value: 'mechanics' } });
    
    // 点击应用筛选验证状态已更新
    const applyButton = screen.getByText('应用筛选');
    fireEvent.click(applyButton);
    
    expect(handleFilterChange).toHaveBeenCalledWith({
      subject: undefined,
      topic: 'mechanics',
      search: undefined,
    });
  });

  it('应该支持部分筛选条件', () => {
    const handleFilterChange = vi.fn();
    render(<QuestionFilter onFilterChange={handleFilterChange} />);
    
    // 只设置科目
    const subjectInput = screen.getByTestId('subject-input');
    fireEvent.change(subjectInput, { target: { value: 'math' } });
    
    const applyButton = screen.getByText('应用筛选');
    fireEvent.click(applyButton);
    
    expect(handleFilterChange).toHaveBeenCalledWith({
      subject: 'math',
      topic: undefined,
      search: undefined,
    });
  });

  it('应该在没有 onFilterChange 回调时不报错', () => {
    render(<QuestionFilter />);
    
    const applyButton = screen.getByText('应用筛选');
    expect(() => fireEvent.click(applyButton)).not.toThrow();
    
    const clearButton = screen.getByText('清除');
    expect(() => fireEvent.click(clearButton)).not.toThrow();
  });
});
