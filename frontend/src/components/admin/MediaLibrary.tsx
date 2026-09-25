'use client';
import { Check, Copy, Eye, Image as ImageIcon, Leaf, LoaderCircle, Save, Search, ShieldCheck, Trash2, UploadCloud, X } from 'lucide-react';
import { useState } from 'react';
import { useUi } from '@/contexts/UiContext';
import { useAssetActions, useAssets } from '@/hooks/admin';
import { fieldErrors } from '@/lib/api/client';
import type { Asset } from '@/lib/api/types';
import { formatSize } from '@/lib/files';
import { LoadError, Loading, useDialogFocus } from './ui';

const ACCEPT = 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp';
const MAX_MB = 5;

export function MediaLibrary() {
  const { notify } = useUi();
  const assets = useAssets();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Asset | null>(null);
  const [pending, setPending] = useState<File | null>(null);

  if (assets.isLoading) return <Loading />;
  if (assets.isError) return <LoadError error={assets.error} retry={() => assets.refetch()} />;
  const visible = assets.data!.filter((a) => (a.alt_text + a.original_name).includes(search.trim()));

  return (
    <>
      <div className="workspace-toolbar">
        <span className="muted small-text">{assets.data!.length} صور</span>
        <label className="button upload-button">
          <UploadCloud size={17} />إضافة صورة
          <input type="file" accept={ACCEPT} onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            if (!['image/png', 'image/jpeg', 'image/webp'].includes(f.type)) { notify('اختر صورة PNG أو JPG أو WebP.'); return; }
            if (f.size > MAX_MB * 1024 * 1024) { notify(`حجم الصورة أكبر من ${MAX_MB} MB.`); return; }
            setPending(f);
          }} />
        </label>
      </div>
      <div className="media-banner">
        <span><ImageIcon size={30} /></span>
        <div><h2>صور تحكي عن خدماتك.</h2><p>مكتبة واحدة للصور العامة والشعار. اختر منها عند تحرير الخدمة أو الإعدادات.</p></div>
        <small>صور عامة فقط<br /><b>PNG · JPG · WebP</b></small>
      </div>
      <div className="workspace-search">
        <Search size={17} />
        <input aria-label="البحث في الوسائط" placeholder="ابحث بوصف الصورة أو اسمها..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="media-grid">
        {visible.map((a) => (
          <button className="media-card" key={a.id} onClick={() => setSelected({ ...a })}>
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.url} alt={a.alt_text} width={a.width} height={a.height} loading="lazy" />
              <span><Eye size={15} /></span>
            </div>
            <section>
              <h3>{a.alt_text}</h3>
              <small>{a.width}×{a.height} · {formatSize(a.size)}</small>
              <b>{a.usage.length ? `مستخدمة (${a.usage.length})` : 'غير مستخدمة'}</b>
            </section>
          </button>
        ))}
        {!visible.length && (
          <div className="empty-state"><ImageIcon size={34} /><h2>لا توجد صور</h2><p>أضف صورة لتستخدمها في الخدمات أو كشعار.</p></div>
        )}
      </div>
      <div className="design-tip"><ShieldCheck size={18} /><span>تُصغَّر الصور الكبيرة إلى 2000 بكسل وتُزال منها البيانات الوصفية (مثل موقع التصوير) قبل النشر. مرفقات العملاء خاصة ولا تظهر هنا.</span></div>
      {pending && <UploadDialog file={pending} onClose={() => setPending(null)} />}
      {selected && <AssetDialog asset={selected} setAsset={setSelected} onClose={() => setSelected(null)} />}
    </>
  );
}

function UploadDialog({ file, onClose }: { file: File; onClose: () => void }) {
  const { notify } = useUi();
  const { upload } = useAssetActions();
  const [alt, setAlt] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [preview] = useState(() => URL.createObjectURL(file));
  useDialogFocus(true, onClose, '.media-upload-dialog');
  return (
    <div className="modal-backdrop">
      <form className="media-modal media-upload-dialog" role="dialog" aria-modal="true" aria-label="إضافة صورة" onSubmit={(e) => {
        e.preventDefault();
        upload.mutate({ file, alt_text: alt.trim() }, {
          onSuccess: () => { notify('أضيفت الصورة إلى المكتبة.'); URL.revokeObjectURL(preview); onClose(); },
          onError: (er) => { setErrors(fieldErrors(er)); notify(fieldErrors(er).file || er.message); },
        });
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <div className="media-modal-image"><img src={preview} alt="" /></div>
        <div className="media-modal-body">
          <div className="panel-heading"><div><span className="eyebrow">صورة جديدة</span><h2>كل صورة، بمعناها.</h2></div>
            <button type="button" className="icon-button" aria-label="إلغاء" onClick={onClose}><X /></button></div>
          <p className="subtle-copy" dir="auto">{file.name} · {formatSize(file.size)}</p>
          <label>النص البديل <em>*</em>
            <textarea rows={3} required maxLength={200} value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="صف ما يظهر في الصورة باختصار" />
            <small>يقرؤه من لا يرى الصورة وتفهمه محركات البحث.</small>
            {errors.alt_text && <small className="field-error">{errors.alt_text}</small>}
            {errors.file && <small className="field-error">{errors.file}</small>}
          </label>
          <div className="save-row"><span /><button className="button" disabled={upload.isPending || !alt.trim()}>
            {upload.isPending ? <><LoaderCircle className="spin" size={16} />جارٍ الرفع</> : <><UploadCloud size={16} />رفع الصورة</>}
          </button></div>
        </div>
      </form>
    </div>
  );
}

function AssetDialog({ asset, setAsset, onClose }: { asset: Asset; setAsset: (a: Asset) => void; onClose: () => void }) {
  const { notify } = useUi();
  const { update, remove } = useAssetActions();
  const [copied, setCopied] = useState(false);
  useDialogFocus(true, onClose, '.media-detail-dialog');
  return (
    <div className="modal-backdrop">
      <section className="media-modal media-detail-dialog" role="dialog" aria-modal="true" aria-label="تفاصيل الصورة">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <div className="media-modal-image"><img src={asset.url} alt={asset.alt_text} /></div>
        <div className="media-modal-body">
          <div className="panel-heading"><div><span className="eyebrow">تفاصيل الوسيط</span><h2>كل صورة، بمعناها.</h2></div>
            <button className="icon-button" aria-label="إغلاق تفاصيل الصورة" onClick={onClose}><X /></button></div>
          <label>النص البديل<textarea rows={3} maxLength={200} value={asset.alt_text} onChange={(e) => setAsset({ ...asset, alt_text: e.target.value })} /></label>
          <p className="subtle-copy">{asset.width}×{asset.height} · {formatSize(asset.size)} · <span dir="auto">{asset.original_name}</span></p>
          <p className="subtle-copy">{asset.usage.length ? `مستخدمة في: ${asset.usage.join('، ')}` : 'غير مستخدمة حاليًا.'}</p>
          <div className="save-row">
            <div className="inline-actions">
              <button className="text-button" onClick={async () => { try { await navigator.clipboard.writeText(location.origin + asset.url); setCopied(true); } catch { notify('انسخ الرابط يدويًا.'); } }}>
                {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'نُسخ الرابط' : 'نسخ الرابط'}
              </button>
              <button className="text-button" disabled={!!asset.usage.length || remove.isPending} title={asset.usage.length ? 'أزلها من أماكن استخدامها أولًا' : 'حذف'}
                onClick={() => confirm('حذف الصورة نهائيًا؟') && remove.mutate(asset.id, { onSuccess: () => { notify('حُذفت الصورة.'); onClose(); }, onError: (e) => notify(e.message) })}>
                <Trash2 size={14} />حذف
              </button>
            </div>
            <button className="button" disabled={update.isPending || !asset.alt_text.trim()} onClick={() => update.mutate({ id: asset.id, alt_text: asset.alt_text.trim() }, {
              onSuccess: () => { notify('حُفظ الوصف.'); onClose(); }, onError: (e) => notify(fieldErrors(e).alt_text || e.message),
            })}><Save size={16} />حفظ</button>
          </div>
        </div>
      </section>
    </div>
  );
}

/** Pick an image from the library (or none). Value is the asset id. */
export function AssetPicker({ value, onChange, label }: { value: string | null; onChange: (id: string | null) => void; label: string }) {
  const assets = useAssets();
  return (
    <div className="asset-picker">
      <label>{label}</label>
      <div className="asset-options">
        <button type="button" className={!value ? 'selected' : ''} onClick={() => onChange(null)} aria-pressed={!value}>
          <span className="default-asset"><Leaf size={22} /></span><small>بدون صورة</small>{!value && <Check size={13} />}
        </button>
        {(assets.data || []).map((a) => (
          <button type="button" key={a.id} className={value === a.id ? 'selected' : ''} onClick={() => onChange(a.id)} aria-pressed={value === a.id} title={a.alt_text}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={a.url} alt={a.alt_text} loading="lazy" /><small>{a.alt_text}</small>{value === a.id && <Check size={13} />}
          </button>
        ))}
      </div>
      {assets.data && !assets.data.length && <small className="subtle-copy">المكتبة فارغة. أضف صورًا من «مكتبة الوسائط».</small>}
    </div>
  );
}
