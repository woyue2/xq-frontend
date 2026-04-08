/**
 * [POS] src/test/ImageUploader.test.tsx
 *   所属：test 层 | 角色：ImageUploader 组件单元测试
 *
 * [INPUT]
 *   - @testing-library/react        → render / screen / fireEvent / waitFor
 *   - vitest                         → describe / it / expect / vi / beforeEach / afterEach
 *   - @/components/ImageUploader     → ImageUploader
 *
 * [OUTPUT]
 *   - ImageUploader 组件测试套件
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/test/CLAUDE.md 的文件清单（如存在）
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImageUploader } from '@/components/ImageUploader';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock alert
const mockAlert = vi.fn();
global.alert = mockAlert;

describe('ImageUploader', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('mock-token');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload button when no images', () => {
    render(<ImageUploader value={[]} onChange={mockOnChange} />);
    
    expect(screen.getByText('上传图片')).toBeInTheDocument();
    expect(screen.getByText(/\(0\/3\)/)).toBeInTheDocument();
  });

  it('displays uploaded images', () => {
    const images = [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg'
    ];

    render(<ImageUploader value={images} onChange={mockOnChange} />);

    const imgs = screen.getAllByRole('img');
    expect(imgs).toHaveLength(2);
    expect(imgs[0]).toHaveAttribute('src', images[0]);
    expect(imgs[1]).toHaveAttribute('src', images[1]);
  });

  it('shows correct count in upload button', () => {
    const images = ['https://example.com/image1.jpg'];

    render(<ImageUploader value={images} onChange={mockOnChange} />);

    expect(screen.getByText(/\(1\/3\)/)).toBeInTheDocument();
  });

  it('hides upload button when max count reached', () => {
    const images = [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
      'https://example.com/image3.jpg'
    ];

    render(<ImageUploader value={images} onChange={mockOnChange} maxCount={3} />);

    expect(screen.queryByText('上传图片')).not.toBeInTheDocument();
  });

  it('removes image when delete button clicked', () => {
    const images = [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg'
    ];

    render(<ImageUploader value={images} onChange={mockOnChange} />);

    const deleteButtons = screen.getAllByLabelText('删除');
    fireEvent.click(deleteButtons[0]);

    expect(mockOnChange).toHaveBeenCalledWith(['https://example.com/image2.jpg']);
  });

  it('does not show delete button when disabled', () => {
    const images = ['https://example.com/image1.jpg'];

    render(<ImageUploader value={images} onChange={mockOnChange} disabled />);

    expect(screen.queryByLabelText('删除')).not.toBeInTheDocument();
  });

  it('does not show upload button when disabled', () => {
    render(<ImageUploader value={[]} onChange={mockOnChange} disabled />);

    expect(screen.queryByText('上传图片')).not.toBeInTheDocument();
  });

  it('respects custom maxCount', () => {
    render(<ImageUploader value={[]} onChange={mockOnChange} maxCount={1} />);

    expect(screen.getByText(/\(0\/1\)/)).toBeInTheDocument();
    expect(screen.getByText(/最多 1 张/)).toBeInTheDocument();
  });

  it('validates file format - rejects unsupported format', async () => {
    render(<ImageUploader value={[]} onChange={mockOnChange} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith(
        expect.stringContaining('格式不支持')
      );
    });
  });

  it('validates file format - accepts supported format', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://example.com/uploaded.jpg' })
    });

    render(<ImageUploader value={[]} onChange={mockOnChange} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/upload',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer mock-token'
          }
        })
      );
    });
  });

  it('validates file size - rejects oversized file', async () => {
    render(<ImageUploader value={[]} onChange={mockOnChange} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const largeContent = new Array(6 * 1024 * 1024).fill('a').join(''); // 6MB
    const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith(
        expect.stringContaining('大小超过限制')
      );
    });
  });

  it('validates file size - accepts file within limit', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://example.com/uploaded.jpg' })
    });

    render(<ImageUploader value={[]} onChange={mockOnChange} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const smallContent = new Array(1024).fill('a').join(''); // 1KB
    const file = new File([smallContent], 'small.jpg', { type: 'image/jpeg' });

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it('uploads file and calls onChange with new URL', async () => {
    const uploadedUrl = 'https://example.com/uploaded.jpg';
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: uploadedUrl })
    });

    render(<ImageUploader value={[]} onChange={mockOnChange} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([uploadedUrl]);
    }, { timeout: 3000 });
  });

  it('shows error message when upload fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: '上传失败' })
    });

    render(<ImageUploader value={[]} onChange={mockOnChange} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText('上传失败')).toBeInTheDocument();
    });
  });

  it('shows retry button when upload fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: '上传失败' })
    });

    render(<ImageUploader value={[]} onChange={mockOnChange} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText('重试')).toBeInTheDocument();
    });
  });

  it('limits number of files to available slots', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://example.com/uploaded.jpg' })
    });

    const existingImages = ['https://example.com/existing.jpg'];
    render(<ImageUploader value={existingImages} onChange={mockOnChange} maxCount={3} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const files = [
      new File(['content1'], 'test1.jpg', { type: 'image/jpeg' }),
      new File(['content2'], 'test2.jpg', { type: 'image/jpeg' }),
      new File(['content3'], 'test3.jpg', { type: 'image/jpeg' })
    ];

    Object.defineProperty(input, 'files', {
      value: files,
      writable: false
    });

    fireEvent.change(input);

    // Should only upload 2 files (3 max - 1 existing = 2 available slots)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  it('shows progress indicator during upload', async () => {
    mockFetch.mockImplementationOnce(() => 
      new Promise(resolve => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: async () => ({ url: 'https://example.com/uploaded.jpg' })
          });
        }, 1000);
      })
    );

    render(<ImageUploader value={[]} onChange={mockOnChange} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
    });
  });

  it('requires authentication token', async () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    render(<ImageUploader value={[]} onChange={mockOnChange} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText('需要登录')).toBeInTheDocument();
    });
  });
});
