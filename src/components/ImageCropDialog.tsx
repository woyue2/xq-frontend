import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

type ImageCropDialogProps = {
  open: boolean;
  file: File | null;
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

const MIN_CROP_SIZE = 24;
// 修改原因：方案B要求支持“边缘附近”触发缩放，设置统一命中热区半径。
const EDGE_HIT_SIZE = 12;
// 修改原因：方案B要求可视化 8 向手柄，提高手势发现性与可操作性。
const HANDLE_SIZE = 10;

export function ImageCropDialog(props: ImageCropDialogProps) {
  const { open, file, onCancel, onConfirm } = props;
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  // 修改原因：支持“框内拖动移动区域”，在 pointer move 阶段区分“重画”和“移动”。
  const [isMovingRect, setIsMovingRect] = useState(false);
  // 修改原因：方案B要求支持 8 向缩放，记录当前缩放方向。
  const [resizeDirection, setResizeDirection] = useState<ResizeDirection | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  // 修改原因：8 向缩放需基于“起始框 + 起始指针”做增量计算，避免拖动过程中跳变。
  const [resizeStartRect, setResizeStartRect] = useState<CropRect | null>(null);
  const [resizeStartPoint, setResizeStartPoint] = useState<{ x: number; y: number } | null>(null);
  // 修改原因：移动裁剪框时需要记录手指/鼠标与裁剪框左上角的偏移，避免跳变。
  const [moveOffset, setMoveOffset] = useState<{ x: number; y: number } | null>(null);

  const objectUrl = useMemo(() => {
    if (!file) return '';
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  useEffect(() => {
    if (!open) {
      setCropRect(null);
      setPreviewSize({ width: 0, height: 0 });
      setIsDrawing(false);
      setIsMovingRect(false);
      setResizeDirection(null);
      setStartPoint(null);
      setResizeStartRect(null);
      setResizeStartPoint(null);
      setMoveOffset(null);
    }
  }, [open]);

  const normalizePoint = (clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const y = Math.min(Math.max(clientY - rect.top, 0), rect.height);
    return { x, y };
  };

  const isPointInRect = (point: { x: number; y: number }, rect: CropRect) =>
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height;

  const detectResizeDirection = (point: { x: number; y: number }, rect: CropRect): ResizeDirection | null => {
    const left = rect.x;
    const right = rect.x + rect.width;
    const top = rect.y;
    const bottom = rect.y + rect.height;

    const nearLeft = Math.abs(point.x - left) <= EDGE_HIT_SIZE;
    const nearRight = Math.abs(point.x - right) <= EDGE_HIT_SIZE;
    const nearTop = Math.abs(point.y - top) <= EDGE_HIT_SIZE;
    const nearBottom = Math.abs(point.y - bottom) <= EDGE_HIT_SIZE;
    const withinHorizontalBand = point.x >= left - EDGE_HIT_SIZE && point.x <= right + EDGE_HIT_SIZE;
    const withinVerticalBand = point.y >= top - EDGE_HIT_SIZE && point.y <= bottom + EDGE_HIT_SIZE;

    if (nearTop && nearLeft) return 'nw';
    if (nearTop && nearRight) return 'ne';
    if (nearBottom && nearLeft) return 'sw';
    if (nearBottom && nearRight) return 'se';
    if (nearTop && withinHorizontalBand) return 'n';
    if (nearBottom && withinHorizontalBand) return 's';
    if (nearLeft && withinVerticalBand) return 'w';
    if (nearRight && withinVerticalBand) return 'e';

    return null;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const p = normalizePoint(event.clientX, event.clientY);
    if (!p) return;

    if (cropRect) {
      const direction = detectResizeDirection(p, cropRect);
      if (direction) {
        // 修改原因：按方案B优先进入缩放模式，保证边缘命中时不会误触发框内移动。
        setResizeDirection(direction);
        setResizeStartRect(cropRect);
        setResizeStartPoint(p);
        setIsDrawing(false);
        setIsMovingRect(false);
        setMoveOffset(null);
        setStartPoint(null);
        return;
      }
    }

    if (cropRect && isPointInRect(p, cropRect)) {
      // 修改原因：在已有裁剪框内部按下时，进入“移动区域”模式而非重画模式。
      setIsMovingRect(true);
      setIsDrawing(false);
      setResizeDirection(null);
      setResizeStartRect(null);
      setResizeStartPoint(null);
      setMoveOffset({
        x: p.x - cropRect.x,
        y: p.y - cropRect.y,
      });
      setStartPoint(null);
      return;
    }

    setIsDrawing(true);
    setIsMovingRect(false);
    setStartPoint(p);
    setMoveOffset(null);
    setCropRect({
      x: p.x,
      y: p.y,
      width: 0,
      height: 0,
    });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const p = normalizePoint(event.clientX, event.clientY);
    if (!p) return;

    if (resizeDirection && resizeStartRect && resizeStartPoint) {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      const startLeft = resizeStartRect.x;
      const startTop = resizeStartRect.y;
      const startRight = resizeStartRect.x + resizeStartRect.width;
      const startBottom = resizeStartRect.y + resizeStartRect.height;
      const dx = p.x - resizeStartPoint.x;
      const dy = p.y - resizeStartPoint.y;

      let left = startLeft;
      let right = startRight;
      let top = startTop;
      let bottom = startBottom;

      if (resizeDirection.includes('e')) {
        right = Math.min(Math.max(startRight + dx, left + MIN_CROP_SIZE), rect.width);
      }
      if (resizeDirection.includes('w')) {
        left = Math.max(Math.min(startLeft + dx, right - MIN_CROP_SIZE), 0);
      }
      if (resizeDirection.includes('s')) {
        bottom = Math.min(Math.max(startBottom + dy, top + MIN_CROP_SIZE), rect.height);
      }
      if (resizeDirection.includes('n')) {
        top = Math.max(Math.min(startTop + dy, bottom - MIN_CROP_SIZE), 0);
      }

      // ⚠️ 不确定因素：当前热区和缩放阈值使用固定像素，在高 DPI 或超大屏设备上手感可能需后续微调。
      setCropRect({
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
      });
      return;
    }

    if (isMovingRect && cropRect && moveOffset) {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      const maxX = Math.max(0, rect.width - cropRect.width);
      const maxY = Math.max(0, rect.height - cropRect.height);
      const nextX = Math.min(Math.max(p.x - moveOffset.x, 0), maxX);
      const nextY = Math.min(Math.max(p.y - moveOffset.y, 0), maxY);

      setCropRect({
        ...cropRect,
        x: nextX,
        y: nextY,
      });
      return;
    }

    if (isDrawing && startPoint) {
      const left = Math.min(startPoint.x, p.x);
      const top = Math.min(startPoint.y, p.y);
      const width = Math.abs(p.x - startPoint.x);
      const height = Math.abs(p.y - startPoint.y);
      setCropRect({
        x: left,
        y: top,
        width,
        height,
      });
    }
  };

  const finishDrawing = () => {
    if (!isDrawing && !isMovingRect && !resizeDirection) return;
    setIsDrawing(false);
    setIsMovingRect(false);
    setResizeDirection(null);
    setStartPoint(null);
    setResizeStartRect(null);
    setResizeStartPoint(null);
    setMoveOffset(null);
  };

  const handleImageLoaded = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    const rect = img.getBoundingClientRect();
    setPreviewSize({
      width: rect.width,
      height: rect.height,
    });

    // 修改原因：初始化给出可直接使用的裁剪框，减少首次使用操作成本。
    const width = rect.width * 0.8;
    const height = rect.height * 0.8;
    setCropRect({
      x: (rect.width - width) / 2,
      y: (rect.height - height) / 2,
      width,
      height,
    });
  };

  const handleConfirm = async () => {
    if (!file || !cropRect || !imageRef.current || !previewSize.width || !previewSize.height) {
      toast.error('请先选择裁剪区域');
      return;
    }

    if (cropRect.width < MIN_CROP_SIZE || cropRect.height < MIN_CROP_SIZE) {
      toast.error('裁剪区域过小，请重新选择');
      return;
    }

    const image = imageRef.current;
    const scaleX = image.naturalWidth / previewSize.width;
    const scaleY = image.naturalHeight / previewSize.height;

    const sx = Math.max(0, Math.floor(cropRect.x * scaleX));
    const sy = Math.max(0, Math.floor(cropRect.y * scaleY));
    const sw = Math.max(1, Math.floor(cropRect.width * scaleX));
    const sh = Math.max(1, Math.floor(cropRect.height * scaleY));

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      toast.error('当前环境不支持图片裁剪');
      return;
    }

    // ⚠️ 不确定因素：当前实现未处理移动端个别图片的 EXIF 方向差异，若出现方向异常需在读取阶段追加方向纠正。
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((nextBlob) => resolve(nextBlob), 'image/jpeg', 0.92);
    });

    if (!blob) {
      toast.error('图片裁剪失败，请重试');
      return;
    }

    const baseName = file.name.replace(/\.[^.]+$/, '');
    const croppedFile = new File([blob], `${baseName}-cropped.jpg`, {
      type: 'image/jpeg',
    });
    onConfirm(croppedFile);
  };

  const maskStyle = cropRect
    ? {
        clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${cropRect.x}px ${cropRect.y}px, ${cropRect.x + cropRect.width}px ${cropRect.y}px, ${cropRect.x + cropRect.width}px ${cropRect.y + cropRect.height}px, ${cropRect.x}px ${cropRect.y + cropRect.height}px, ${cropRect.x}px ${cropRect.y}px)`,
      }
    : undefined;

  const handleStyle = (x: number, y: number) => ({
    left: x - HANDLE_SIZE / 2,
    top: y - HANDLE_SIZE / 2,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
  });

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>裁剪图片</DialogTitle>
          <DialogDescription>请拖动选择要保留的区域，确认后将继续上传。</DialogDescription>
        </DialogHeader>

        <div
          ref={containerRef}
          className="relative w-full max-h-[60vh] overflow-hidden rounded-md border bg-black/5 select-none touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrawing}
          onPointerLeave={finishDrawing}
        >
          {/* ⚠️ 不确定因素：当前在图片与容器存在留白时，命中区域按容器坐标计算，极端纵横比图片可能需要再做坐标映射细化。 */}
          {file ? (
            <img
              ref={imageRef}
              src={objectUrl}
              alt="crop-preview"
              className="w-full h-auto max-h-[60vh] object-contain block"
              onLoad={handleImageLoaded}
              draggable={false}
            />
          ) : null}

          {cropRect ? (
            <>
              <div className="absolute inset-0 bg-black/45 pointer-events-none" style={maskStyle} />
              <div
                // 修改原因：按需求让框选区域呈白色区分（外部保持黑色遮罩），提升选区辨识度。
                className="absolute border-2 border-white bg-white/25 shadow-[0_0_0_1px_rgba(0,0,0,0.4)] pointer-events-none"
                style={{
                  left: cropRect.x,
                  top: cropRect.y,
                  width: cropRect.width,
                  height: cropRect.height,
                }}
              />
              {/* 修改原因：方案B要求可视化 8 向缩放手柄（四角+四边），帮助用户理解可拖拽方向。 */}
              <div
                className="absolute rounded-full bg-white border border-black/30 shadow-sm pointer-events-none"
                style={handleStyle(cropRect.x, cropRect.y)}
              />
              <div
                className="absolute rounded-full bg-white border border-black/30 shadow-sm pointer-events-none"
                style={handleStyle(cropRect.x + cropRect.width / 2, cropRect.y)}
              />
              <div
                className="absolute rounded-full bg-white border border-black/30 shadow-sm pointer-events-none"
                style={handleStyle(cropRect.x + cropRect.width, cropRect.y)}
              />
              <div
                className="absolute rounded-full bg-white border border-black/30 shadow-sm pointer-events-none"
                style={handleStyle(cropRect.x + cropRect.width, cropRect.y + cropRect.height / 2)}
              />
              <div
                className="absolute rounded-full bg-white border border-black/30 shadow-sm pointer-events-none"
                style={handleStyle(cropRect.x + cropRect.width, cropRect.y + cropRect.height)}
              />
              <div
                className="absolute rounded-full bg-white border border-black/30 shadow-sm pointer-events-none"
                style={handleStyle(cropRect.x + cropRect.width / 2, cropRect.y + cropRect.height)}
              />
              <div
                className="absolute rounded-full bg-white border border-black/30 shadow-sm pointer-events-none"
                style={handleStyle(cropRect.x, cropRect.y + cropRect.height)}
              />
              <div
                className="absolute rounded-full bg-white border border-black/30 shadow-sm pointer-events-none"
                style={handleStyle(cropRect.x, cropRect.y + cropRect.height / 2)}
              />
            </>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button onClick={handleConfirm}>确认裁剪</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
