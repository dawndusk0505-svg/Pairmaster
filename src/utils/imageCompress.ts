/**
 * Compresses a user-selected image file into a compact JPEG data URL
 * strictly bounded under Firestore's 250,000-char limit so portraits,
 * pet photos, and couple snapshots stay crisp and fast to load.
 */
export const MAX_PHOTO_DATA_URL_CHARS = 240000;

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('無法讀取此相片格式，請改用 JPG、PNG 或 WebP 圖片。'));
    img.src = src;
  });
}

export async function compressNoticePhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('請選擇圖片檔案（JPG、PNG、WebP 或手機相簿相片）。');
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error('相片檔案太大（超過 20MB），請選擇較細的相片。');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImageElement(objectUrl);
    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;

    if (!srcW || !srcH) {
      throw new Error('無法讀取相片尺寸，請換另一張相片再試。');
    }

    const attempts: Array<{ maxSide: number; quality: number }> = [
      { maxSide: 720, quality: 0.84 },
      { maxSide: 600, quality: 0.78 },
      { maxSide: 480, quality: 0.7 },
      { maxSide: 360, quality: 0.6 },
    ];

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('瀏覽器暫時不支援圖片壓縮處理。');
    }

    for (const { maxSide, quality } of attempts) {
      const scale = Math.min(1, maxSide / Math.max(srcW, srcH));
      const targetW = Math.max(1, Math.round(srcW * scale));
      const targetH = Math.max(1, Math.round(srcH * scale));

      canvas.width = targetW;
      canvas.height = targetH;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.drawImage(img, 0, 0, targetW, targetH);

      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      if (dataUrl.length <= MAX_PHOTO_DATA_URL_CHARS) {
        return dataUrl;
      }
    }

    throw new Error('相片壓縮後仍然過大，請嘗試裁切或選取另一張相片。');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
