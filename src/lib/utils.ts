import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const BRL_NO_SYMBOL = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Formata valor como moeda brasileira: R$ 1.234,56 */
export function formatCurrency(value: string | number | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  return BRL.format(isFinite(num) ? num : 0);
}

/** Formata valor sem o símbolo R$: 1.234,56 */
export function formatPrice(value: string | number | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  return BRL_NO_SYMBOL.format(isFinite(num) ? num : 0);
}

const STORAGE_URL = import.meta.env.VITE_STORAGE_URL ?? 'http://localhost:8000/storage';

export function storageUrl(path: string): string {
  if (!path) return '';
  const base = path.startsWith('http') || path.startsWith('blob:') ? path : `${STORAGE_URL}/${path}`;
  if (base.startsWith('blob:')) return base;
  return STORAGE_URL.includes('ngrok') ? `${base}?ngrok-skip-browser-warning=1` : base;
}

export function resizeImage(file: File, maxPx = 800, quality = 0.78): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        if (width >= height) {
          height = Math.round((height * maxPx) / width);
          width = maxPx;
        } else {
          width = Math.round((width * maxPx) / height);
          height = maxPx;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Falha ao processar imagem'))),
        'image/jpeg',
        quality,
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}
