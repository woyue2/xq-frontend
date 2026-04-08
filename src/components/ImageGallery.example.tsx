/**
 * ImageGallery Component Usage Examples
 * 
 * This file demonstrates various use cases of the ImageGallery component.
 */
import { ImageGallery } from './ImageGallery';

// Example 1: Basic usage with multiple images
export function BasicExample() {
  const images = [
    'https://picsum.photos/400/400?random=1',
    'https://picsum.photos/400/400?random=2',
    'https://picsum.photos/400/400?random=3',
  ];

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">基本用法</h2>
      <ImageGallery images={images} />
    </div>
  );
}

// Example 2: Single image
export function SingleImageExample() {
  const images = ['https://picsum.photos/600/400?random=4'];

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">单张图片</h2>
      <ImageGallery images={images} />
    </div>
  );
}

// Example 3: Limited visible images with "+N" overlay
export function LimitedVisibleExample() {
  const images = [
    'https://picsum.photos/400/400?random=5',
    'https://picsum.photos/400/400?random=6',
    'https://picsum.photos/400/400?random=7',
    'https://picsum.photos/400/400?random=8',
    'https://picsum.photos/400/400?random=9',
    'https://picsum.photos/400/400?random=10',
  ];

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">限制显示数量（最多显示3张）</h2>
      <ImageGallery images={images} maxVisible={3} />
      <p className="text-sm text-gray-500 mt-2">
        共 {images.length} 张图片，显示前 3 张，点击查看全部
      </p>
    </div>
  );
}

// Example 4: Two images layout
export function TwoImagesExample() {
  const images = [
    'https://picsum.photos/400/400?random=11',
    'https://picsum.photos/400/400?random=12',
  ];

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">两张图片（2列布局）</h2>
      <ImageGallery images={images} />
    </div>
  );
}

// Example 5: Custom className
export function CustomClassExample() {
  const images = [
    'https://picsum.photos/400/400?random=13',
    'https://picsum.photos/400/400?random=14',
    'https://picsum.photos/400/400?random=15',
  ];

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">自定义样式</h2>
      <ImageGallery images={images} className="max-w-md mx-auto" />
    </div>
  );
}

// Example 6: Usage in Question Card context
export function QuestionContextExample() {
  const questionImages = [
    'https://picsum.photos/400/400?random=16',
    'https://picsum.photos/400/400?random=17',
    'https://picsum.photos/400/400?random=18',
    'https://picsum.photos/400/400?random=19',
  ];

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-base font-bold mb-2">问题标题示例</h3>
      <p className="text-sm text-gray-600 mb-3">
        这是一个包含多张图片的问题内容...
      </p>
      <ImageGallery images={questionImages} maxVisible={3} />
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
        <span>作者名称</span>
        <span>·</span>
        <span>2小时前</span>
      </div>
    </div>
  );
}

// All examples in one demo page
export function AllExamples() {
  return (
    <div className="space-y-8 p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold">ImageGallery 组件示例</h1>
      <BasicExample />
      <SingleImageExample />
      <TwoImagesExample />
      <LimitedVisibleExample />
      <CustomClassExample />
      <QuestionContextExample />
    </div>
  );
}
