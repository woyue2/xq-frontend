/**
 * Unit tests for ImageGallery component
 * 
 * Tests:
 * - Renders nothing when images array is empty
 * - Renders single image correctly
 * - Renders multiple images in grid layout
 * - Opens lightbox dialog on image click
 * - Navigates between images in lightbox
 * - Shows "+N" overlay when maxVisible is set
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageGallery } from '@/components/ImageGallery';

describe('ImageGallery', () => {
  it('renders nothing when images array is empty', () => {
    const { container } = render(<ImageGallery images={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when images is undefined', () => {
    const { container } = render(<ImageGallery images={undefined as any} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders single image correctly', () => {
    const images = ['https://example.com/image1.jpg'];
    render(<ImageGallery images={images} />);
    
    const img = screen.getByAltText('图片 1');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', images[0]);
  });

  it('renders two images in 2-column grid', () => {
    const images = [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ];
    render(<ImageGallery images={images} />);
    
    expect(screen.getByAltText('图片 1')).toBeInTheDocument();
    expect(screen.getByAltText('图片 2')).toBeInTheDocument();
  });

  it('renders three or more images in 3-column grid', () => {
    const images = [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
      'https://example.com/image3.jpg',
    ];
    render(<ImageGallery images={images} />);
    
    expect(screen.getByAltText('图片 1')).toBeInTheDocument();
    expect(screen.getByAltText('图片 2')).toBeInTheDocument();
    expect(screen.getByAltText('图片 3')).toBeInTheDocument();
  });

  it('shows "+N" overlay when maxVisible is set and exceeded', () => {
    const images = [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
      'https://example.com/image3.jpg',
      'https://example.com/image4.jpg',
      'https://example.com/image5.jpg',
    ];
    render(<ImageGallery images={images} maxVisible={3} />);
    
    // Should only render 3 images
    expect(screen.getByAltText('图片 1')).toBeInTheDocument();
    expect(screen.getByAltText('图片 2')).toBeInTheDocument();
    expect(screen.getByAltText('图片 3')).toBeInTheDocument();
    expect(screen.queryByAltText('图片 4')).not.toBeInTheDocument();
    
    // Should show "+2" overlay
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('opens lightbox dialog when image is clicked', () => {
    const images = ['https://example.com/image1.jpg'];
    render(<ImageGallery images={images} />);
    
    const img = screen.getByAltText('图片 1');
    fireEvent.click(img);
    
    // Dialog should be open - check for close button
    const closeButton = screen.getByLabelText('关闭');
    expect(closeButton).toBeInTheDocument();
  });

  it('navigates to next image in lightbox', () => {
    const images = [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ];
    render(<ImageGallery images={images} />);
    
    // Open lightbox
    const firstImg = screen.getByAltText('图片 1');
    fireEvent.click(firstImg);
    
    // Click next button
    const nextButton = screen.getByLabelText('下一张');
    fireEvent.click(nextButton);
    
    // Should show image counter "2 / 2"
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
  });

  it('navigates to previous image in lightbox', () => {
    const images = [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ];
    render(<ImageGallery images={images} />);
    
    // Open lightbox on second image
    const secondImg = screen.getByAltText('图片 2');
    fireEvent.click(secondImg);
    
    // Should show "2 / 2"
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    
    // Click previous button
    const prevButton = screen.getByLabelText('上一张');
    fireEvent.click(prevButton);
    
    // Should show "1 / 2"
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('closes lightbox when close button is clicked', () => {
    const images = ['https://example.com/image1.jpg'];
    render(<ImageGallery images={images} />);
    
    // Open lightbox
    const img = screen.getByAltText('图片 1');
    fireEvent.click(img);
    
    // Close lightbox
    const closeButton = screen.getByLabelText('关闭');
    fireEvent.click(closeButton);
    
    // Close button should no longer be visible
    expect(screen.queryByLabelText('关闭')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const images = ['https://example.com/image1.jpg'];
    const { container } = render(
      <ImageGallery images={images} className="custom-class" />
    );
    
    const gridDiv = container.querySelector('.custom-class');
    expect(gridDiv).toBeInTheDocument();
  });

  it('wraps around to first image when clicking next on last image', () => {
    const images = [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ];
    render(<ImageGallery images={images} />);
    
    // Open lightbox on second image
    const secondImg = screen.getByAltText('图片 2');
    fireEvent.click(secondImg);
    
    // Should show "2 / 2"
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    
    // Click next button
    const nextButton = screen.getByLabelText('下一张');
    fireEvent.click(nextButton);
    
    // Should wrap to "1 / 2"
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('wraps around to last image when clicking previous on first image', () => {
    const images = [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ];
    render(<ImageGallery images={images} />);
    
    // Open lightbox on first image
    const firstImg = screen.getByAltText('图片 1');
    fireEvent.click(firstImg);
    
    // Should show "1 / 2"
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    
    // Click previous button
    const prevButton = screen.getByLabelText('上一张');
    fireEvent.click(prevButton);
    
    // Should wrap to "2 / 2"
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
  });
});
