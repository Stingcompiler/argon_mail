// Mirrors apps/media_library/validation.py so the customer gets instant
// feedback. The server re-checks the real file content.
export const FILE_ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp';
export const IMAGE_ACCEPT = '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp';
const FILE_EXT = ['pdf', 'png', 'jpg', 'jpeg', 'webp'];
const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'webp'];

export function checkFile(file: File, imagesOnly: boolean, maxMb: number): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!(imagesOnly ? IMAGE_EXT : FILE_EXT).includes(ext)) {
    return `نوع الملف «${file.name}» غير مقبول. المسموح: ${imagesOnly ? 'PNG أو JPG أو WebP' : 'PDF أو PNG أو JPG أو WebP'}.`;
  }
  if (file.size === 0) return `الملف «${file.name}» فارغ.`;
  if (file.size > maxMb * 1024 * 1024) return `الملف «${file.name}» أكبر من ${maxMb} MB.`;
  return null;
}

export const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
