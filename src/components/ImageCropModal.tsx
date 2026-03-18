import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut } from 'lucide-react';

const CROP_SIZE = 280; // display size of crop circle (px)
const OUTPUT_SIZE = 400; // final image output size (px)

interface Props {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  onCrop: (blob: Blob) => void;
}

interface Vec2 { x: number; y: number }

export function ImageCropModal({ open, imageSrc, onClose, onCrop }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Vec2>({ x: 0, y: 0 });
  const [naturalW, setNaturalW] = useState(1);
  const [naturalH, setNaturalH] = useState(1);
  const dragging = useRef(false);
  const lastPos = useRef<Vec2>({ x: 0, y: 0 });

  // Minimum scale so the image always covers the crop circle
  const minScale = useCallback(
    (w: number, h: number) => Math.max(CROP_SIZE / w, CROP_SIZE / h),
    []
  );

  // Clamp offset so the image never leaves the crop area
  const clamp = useCallback(
    (ox: number, oy: number, s: number, w: number, h: number): Vec2 => ({
      x: Math.min(0, Math.max(ox, CROP_SIZE - w * s)),
      y: Math.min(0, Math.max(oy, CROP_SIZE - h * s)),
    }),
    []
  );

  // Draw the current frame onto the canvas preview
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !img.complete) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, CROP_SIZE, CROP_SIZE);
    ctx.drawImage(
      img,
      -offset.x / scale,
      -offset.y / scale,
      CROP_SIZE / scale,
      CROP_SIZE / scale,
      0, 0, CROP_SIZE, CROP_SIZE
    );
  }, [offset, scale]);

  // Re-draw whenever offset or scale changes
  useEffect(() => { draw(); }, [draw]);

  // Reset and load image when modal opens
  useEffect(() => {
    if (!open || !imageSrc) return;
    setLoaded(false);
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      imgRef.current = img;
      setNaturalW(w);
      setNaturalH(h);
      const s = minScale(w, h);
      setScale(s);
      setOffset(clamp((CROP_SIZE - w * s) / 2, (CROP_SIZE - h * s) / 2, s, w, h));
      setLoaded(true);
    };
    img.src = imageSrc;
  }, [open, imageSrc, minScale, clamp]);

  const handleScaleChange = (val: number[]) => {
    const s = val[0];
    setScale(s);
    setOffset(prev => clamp(prev.x, prev.y, s, naturalW, naturalH));
  };

  const startDrag = (x: number, y: number) => {
    dragging.current = true;
    lastPos.current = { x, y };
  };

  const moveDrag = useCallback((x: number, y: number) => {
    if (!dragging.current) return;
    const dx = x - lastPos.current.x;
    const dy = y - lastPos.current.y;
    lastPos.current = { x, y };
    setOffset(prev => clamp(prev.x + dx, prev.y + dy, scale, naturalW, naturalH));
  }, [scale, naturalW, naturalH, clamp]);

  const stopDrag = () => { dragging.current = false; };

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(
      img,
      -offset.x / scale,
      -offset.y / scale,
      CROP_SIZE / scale,
      CROP_SIZE / scale,
      0, 0, OUTPUT_SIZE, OUTPUT_SIZE
    );
    canvas.toBlob(blob => { if (blob) onCrop(blob); }, 'image/jpeg', 0.85);
  };

  const min = loaded ? minScale(naturalW, naturalH) : 1;
  const max = min * 3;

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajustar foto de perfil</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-5">
          {/* Canvas crop preview */}
          <div
            className="rounded-full overflow-hidden border-4 border-primary cursor-grab active:cursor-grabbing select-none"
            style={{ width: CROP_SIZE, height: CROP_SIZE }}
            onMouseDown={e => startDrag(e.clientX, e.clientY)}
            onMouseMove={e => moveDrag(e.clientX, e.clientY)}
            onMouseUp={stopDrag}
            onMouseLeave={stopDrag}
            onTouchStart={e => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchMove={e => { e.preventDefault(); moveDrag(e.touches[0].clientX, e.touches[0].clientY); }}
            onTouchEnd={stopDrag}
          >
            <canvas
              ref={canvasRef}
              width={CROP_SIZE}
              height={CROP_SIZE}
              className="block"
              style={{ width: CROP_SIZE, height: CROP_SIZE }}
            />
          </div>

          {/* Zoom slider */}
          {loaded && (
            <div className="flex items-center gap-3 w-full px-1">
              <ZoomOut size={16} className="text-muted-foreground shrink-0" />
              <Slider
                min={min}
                max={max}
                step={(max - min) / 100}
                value={[scale]}
                onValueChange={handleScaleChange}
                className="flex-1"
              />
              <ZoomIn size={16} className="text-muted-foreground shrink-0" />
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Arraste para reposicionar · Deslize para zoom
          </p>

          <div className="flex gap-2 w-full">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1" disabled={!loaded} onClick={handleConfirm}>Confirmar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
