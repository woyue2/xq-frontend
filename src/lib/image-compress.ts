/**
 * 图片压缩工具：统一将图片压缩为 JPG 且控制在指定大小以内。
 *
 * 设计原则：
 * - 仅依赖浏览器原生能力（FileReader + Image + Canvas）；
 * - 使用顺序 / 选择 / 循环三种基本控制结构；
 * - 通过参数控制最大宽高、目标体积与质量范围。
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  maxSizeKB?: number;
  initialQuality?: number;
  minQuality?: number;
}

const DEFAULT_MAX_WIDTH = 1600;
const DEFAULT_MAX_HEIGHT = 1600;
const DEFAULT_MAX_SIZE_KB = 1024;
const DEFAULT_INITIAL_QUALITY = 0.85;
const DEFAULT_MIN_QUALITY = 0.6;
const QUALITY_STEP = 0.05;

/**
 * @pre file 为浏览器环境下选择的图片文件（File.type 以 image/ 开头）
 * @post 返回的新 File 类型固定为 image/jpeg，体积尽量控制在 maxSizeKB 以内
 * @throws Error 当文件不是图片、浏览器不支持必要 API 或多次压缩仍无法满足大小限制时
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const {
    maxWidth = DEFAULT_MAX_WIDTH,
    maxHeight = DEFAULT_MAX_HEIGHT,
    maxSizeKB = DEFAULT_MAX_SIZE_KB,
    initialQuality = DEFAULT_INITIAL_QUALITY,
    minQuality = DEFAULT_MIN_QUALITY
  } = options;

  if (!file.type.startsWith('image/')) {
    throw new Error('仅支持图片文件上传');
  }

  const maxBytes = maxSizeKB * 1024;

  // 如果原始文件已经足够小，且本身就是 JPG，则直接返回
  if (file.size <= maxBytes && file.type === 'image/jpeg') {
    return file;
  }

  const image = await loadImage(file);
  const { width, height } = calculateTargetSize(
    image.width,
    image.height,
    maxWidth,
    maxHeight
  );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('当前环境不支持 Canvas 2D 上下文');
  }

  ctx.drawImage(image, 0, 0, width, height);

  let quality = initialQuality;
  let lastBlob: Blob | null = null;

  // 循环降低质量，直到满足大小限制或降到最小质量
  while (quality >= minQuality) {
    // eslint-disable-next-line no-await-in-loop
    const blob = await canvasToJpegBlob(canvas, quality);
    if (!blob) {
      throw new Error('图片压缩失败，请重试');
    }

    lastBlob = blob;
    if (blob.size <= maxBytes) {
      break;
    }

    quality = parseFloat((quality - QUALITY_STEP).toFixed(2));
  }

  if (!lastBlob) {
    throw new Error('图片压缩失败，请重试');
  }

  if (lastBlob.size > maxBytes) {
    throw new Error('图片过大，请裁剪后重新上传');
  }

  const fileName = normalizeToJpegName(file.name);
  return new File([lastBlob], fileName, { type: 'image/jpeg' });
}

// 加载图片为 HTMLImageElement
async function loadImage(file: File): Promise<HTMLImageElement> {
  const dataUrl = await readFileAsDataUrl(file);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片加载失败，请重试'));
    img.src = dataUrl;
  });
}

// 将 File 读取为 data URL
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(new Error('图片读取失败，请检查文件是否损坏'));
    reader.readAsDataURL(file);
  });
}

// 根据最大宽高计算目标尺寸（等比例缩放）
function calculateTargetSize(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const widthRatio = maxWidth / width;
  const heightRatio = maxHeight / height;
  const ratio = Math.min(widthRatio, heightRatio, 1);

  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio)
  };
}

// 将 Canvas 转为 JPEG Blob
function canvasToJpegBlob(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (canvas.toBlob) {
      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        'image/jpeg',
        quality
      );
      return;
    }

    // 部分极端环境可能不支持 toBlob，退化为 dataURL 再转换
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    const matches = dataUrl.match(/^data:image\/jpeg;base64,(.+)$/);
    if (!matches) {
      resolve(null);
      return;
    }
    const binary = atob(matches[1]);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    resolve(new Blob([bytes], { type: 'image/jpeg' }));
  });
}

// 统一将文件名后缀改为 .jpg
function normalizeToJpegName(name: string): string {
  if (!name) return `image-${Date.now()}.jpg`;
  const index = name.lastIndexOf('.');
  if (index === -1) {
    return `${name}.jpg`;
  }
  return `${name.slice(0, index)}.jpg`;
}

