import { Eye } from 'lucide-react';

/** Shown on draft previews opened from the dashboard (signed link). */
export function PreviewBanner() {
  return (
    <div className="preview-banner" role="status">
      <Eye size={16} />معاينة مسودة غير منشورة. الرابط صالح لنصف ساعة ولا يظهر في محركات البحث.
    </div>
  );
}
