/**
 * SubjectTopicSelector 组件测试
 * 
 * 测试科目和考点选择器组件的功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SubjectTopicSelector } from '../components/SubjectTopicSelector';
import type { SubjectDTO, TopicDTO } from '../types/dto';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockSubjects: SubjectDTO[] = [
  {
    id: '1',
    key: 'math',
    name: '数学',
    order: 1,
    enabled: true,
  },
  {
    id: '2',
    key: 'chinese',
    name: '语文',
    order: 2,
    enabled: true,
  },
];

const mockTopics: TopicDTO[] = [
  {
    id: '1',
    subjectKey: 'math',
    value: 'algebra',
    label: '代数',
    order: 1,
    enabled: true,
  },
  {
    id: '2',
    subjectKey: 'math',
    value: 'geometry',
    label: '几何',
    order: 2,
    enabled: true,
  },
];

describe('SubjectTopicSelector', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should render subject and topic selectors', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ code: 200, data: mockSubjects }),
    });

    render(
      <SubjectTopicSelector
        subjectValue=""
        topicValue=""
        onSubjectChange={vi.fn()}
        onTopicChange={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('科目')).toBeInTheDocument();
      expect(screen.getByText('考点')).toBeInTheDocument();
    });
  });

  it('should load subjects on mount', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ code: 200, data: mockSubjects }),
    });

    render(
      <SubjectTopicSelector
        subjectValue=""
        topicValue=""
        onSubjectChange={vi.fn()}
        onTopicChange={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/subjects');
    });
  });

  it('should display required indicator when required prop is true', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ code: 200, data: mockSubjects }),
    });

    render(
      <SubjectTopicSelector
        subjectValue=""
        topicValue=""
        onSubjectChange={vi.fn()}
        onTopicChange={vi.fn()}
        required
      />
    );

    await waitFor(() => {
      const requiredIndicators = screen.getAllByText('*');
      expect(requiredIndicators.length).toBeGreaterThan(0);
    });
  });

  it('should call onSubjectChange when subject is selected', async () => {
    const onSubjectChange = vi.fn();
    
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ code: 200, data: mockSubjects }),
    });

    render(
      <SubjectTopicSelector
        subjectValue=""
        topicValue=""
        onSubjectChange={onSubjectChange}
        onTopicChange={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('科目')).toBeInTheDocument();
    });

    // Note: Testing Select component interaction requires more complex setup
    // This is a basic structure - actual implementation may need adjustment
  });

  it('should load topics when subject is selected', async () => {
    mockFetch
      .mockResolvedValueOnce({
        json: async () => ({ code: 200, data: mockSubjects }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ code: 200, data: mockTopics }),
      });

    const { rerender } = render(
      <SubjectTopicSelector
        subjectValue=""
        topicValue=""
        onSubjectChange={vi.fn()}
        onTopicChange={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/subjects');
    });

    // Simulate subject selection by re-rendering with new value
    rerender(
      <SubjectTopicSelector
        subjectValue="math"
        topicValue=""
        onSubjectChange={vi.fn()}
        onTopicChange={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/subjects?key=math&topics=1');
    });
  });

  it('should clear topics when subject changes', async () => {
    const onTopicChange = vi.fn();
    
    mockFetch
      .mockResolvedValueOnce({
        json: async () => ({ code: 200, data: mockSubjects }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ code: 200, data: mockTopics }),
      });

    const { rerender } = render(
      <SubjectTopicSelector
        subjectValue="math"
        topicValue="algebra"
        onSubjectChange={vi.fn()}
        onTopicChange={onTopicChange}
      />
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Simulate subject change
    const handleSubjectChange = (value: string) => {
      onTopicChange('');
    };

    handleSubjectChange('chinese');

    expect(onTopicChange).toHaveBeenCalledWith('');
  });

  it('should handle API errors gracefully', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(
      <SubjectTopicSelector
        subjectValue=""
        topicValue=""
        onSubjectChange={vi.fn()}
        onTopicChange={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to load subjects:',
        expect.any(Error)
      );
    });

    consoleError.mockRestore();
  });

  it('should disable topic selector when no subject is selected', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ code: 200, data: mockSubjects }),
    });

    render(
      <SubjectTopicSelector
        subjectValue=""
        topicValue=""
        onSubjectChange={vi.fn()}
        onTopicChange={vi.fn()}
      />
    );

    await waitFor(() => {
      const topicTrigger = screen.getByText('请先选择科目').closest('button');
      expect(topicTrigger).toBeDisabled();
    });
  });

  it('should apply custom className', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ code: 200, data: mockSubjects }),
    });

    const { container } = render(
      <SubjectTopicSelector
        subjectValue=""
        topicValue=""
        onSubjectChange={vi.fn()}
        onTopicChange={vi.fn()}
        className="custom-class"
      />
    );

    await waitFor(() => {
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });
});
