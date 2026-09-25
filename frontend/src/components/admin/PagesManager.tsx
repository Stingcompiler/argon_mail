'use client';
import { Eye, FileText, Plus, Save, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useUi } from '@/contexts/UiContext';
import { usePageActions, usePages } from '@/hooks/admin';
import { fieldErrors } from '@/lib/api/client';
import type { AdminPage } from '@/lib/api/types';
import { formatDateTime } from '@/lib/format';
import { LoadError, Loading, SectionTitle, Toggle, useDialogFocus } from './ui';

const publicUrl = (p: { slug: string }) => (p.slug === 'privacy' || p.slug === 'terms' ? `/${p.slug}` : `/p/${encodeURIComponent(p.slug)}`);
const blank: Partial<AdminPage> = { title: '', slug: '', body: '', status: 'draft', show_in_footer: true, seo_title: '', seo_description: '' };

export function PagesManager() {
  const pages = usePages();
  const [editing, setEditing] = useState<Partial<AdminPage> | null>(null);
  if (pages.isLoading) return <Loading />;
  if (pages.isError) return <LoadError error={pages.error} retry={() => pages.refetch()} />;
  return (
    <>
      <div className="workspace-toolbar">
        <p className="subtle-copy">صفحتا الخصوصية والشروط ثابتتان في الموقع ونموذج الطلب يربط بهما. أضف ما تحتاجه من صفحات أخرى.</p>
        <button className="button" onClick={() => setEditing({ ...blank })}><Plus size={17} />صفحة جديدة</button>
      </div>
      <section className="table-panel">
        <div className="table-scroll">
          <table>
            <thead><tr><th>الصفحة</th><th>الرابط</th><th>الحالة</th><th>التذييل</th><th>آخر تعديل</th><th /></tr></thead>
            <tbody>
              {pages.data!.map((p) => (
                <tr key={p.id} onClick={() => setEditing({ ...p })}>
                  <td><b>{p.title}</b>{p.needs_review && <small className="field-error" style={{ display: 'block' }}>نص مبدئي يحتاج مراجعتك</small>}</td>
                  <td dir="ltr" className="muted">{publicUrl(p)}</td>
                  <td>{p.status === 'published' ? 'منشورة' : 'مسودة'}</td>
                  <td>{p.show_in_footer ? 'نعم' : '—'}</td>
                  <td className="muted">{formatDateTime(p.updated_at)}</td>
                  <td><button className="icon-button" aria-label={'تحرير ' + p.title} onClick={(e) => { e.stopPropagation(); setEditing({ ...p }); }}><FileText size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {editing && <PageEditor draft={editing} setDraft={setEditing} onClose={() => setEditing(null)} />}
    </>
  );
}

function PageEditor({ draft, setDraft, onClose }: { draft: Partial<AdminPage>; setDraft: (p: Partial<AdminPage>) => void; onClose: () => void }) {
  const { notify } = useUi();
  const { save, remove } = usePageActions();
  const [errors, setErrors] = useState<Record<string, string>>({});
  useDialogFocus(true, onClose);
  const set = (p: Partial<AdminPage>) => setDraft({ ...draft, ...p });
  const err = (k: string) => errors[k] && <small className="field-error" role="alert">{errors[k]}</small>;
  const submit = () => {
    setErrors({});
    const { id, title, body, status, show_in_footer, seo_title, seo_description, slug, is_system } = draft;
    save.mutate({ id, title, body, status, show_in_footer, seo_title, seo_description, ...(is_system ? {} : { slug }) }, {
      onSuccess: (p) => { notify(p.status === 'published' ? 'حُفظت الصفحة وتظهر في الموقع خلال ثوانٍ.' : 'حُفظت الصفحة كمسودة.'); onClose(); },
      onError: (e) => { setErrors(fieldErrors(e)); notify(e.message); },
    });
  };
  return (
    <div className="drawer-backdrop">
      <section className="service-drawer" role="dialog" aria-modal="true" aria-label="محرر الصفحة">
        <header>
          <div><span className="eyebrow">{draft.is_system ? 'صفحة أساسية' : 'صفحة مخصصة'}</span><h2>{draft.id ? 'تحرير الصفحة' : 'صفحة جديدة'}</h2></div>
          <button className="icon-button" aria-label="إغلاق" onClick={onClose}><X /></button>
        </header>
        <div className="drawer-body">
          <SectionTitle icon={FileText} title="المحتوى" text='افصل الفقرات بسطر فارغ. ابدأ السطر بـ "## " ليصبح عنوانًا فرعيًا.' />
          <label>العنوان <em>*</em><input value={draft.title || ''} maxLength={120} onChange={(e) => set({ title: e.target.value })} />{err('title')}</label>
          {!draft.is_system && (
            <label>رابط الصفحة<input dir="auto" value={draft.slug || ''} maxLength={80} onChange={(e) => set({ slug: e.target.value })} placeholder="يُولَّد من العنوان تلقائيًا" />
              <small dir="ltr">/p/{draft.slug || '…'}</small>{err('slug')}</label>
          )}
          <label>النص<textarea rows={16} maxLength={30000} value={draft.body || ''} onChange={(e) => set({ body: e.target.value })} />{err('body')}</label>
          <div className="switch-row"><div><b>منشورة</b><p>{draft.is_system ? 'صفحتا الخصوصية والشروط تبقيان منشورتين.' : 'المسودة لا تظهر في الموقع ولا في خريطة الموقع.'}</p></div>
            <Toggle checked={draft.status === 'published'} disabled={draft.is_system} label="نشر الصفحة" onChange={(v) => set({ status: v ? 'published' : 'draft' })} /></div>
          {err('status')}
          <div className="switch-row"><div><b>رابط في تذييل الموقع</b></div><Toggle checked={!!draft.show_in_footer} label="إظهار في التذييل" onChange={(v) => set({ show_in_footer: v })} /></div>
          <h3>محركات البحث</h3>
          <label>عنوان الصفحة في البحث<input value={draft.seo_title || ''} maxLength={70} onChange={(e) => set({ seo_title: e.target.value })} placeholder={draft.title} /></label>
          <label>الوصف في نتائج البحث<textarea rows={2} maxLength={170} value={draft.seo_description || ''} onChange={(e) => set({ seo_description: e.target.value })} /></label>
        </div>
        <footer className="drawer-footer">
          <div className="inline-actions">
            {draft.id && !draft.is_system && (
              <button className="text-button" disabled={remove.isPending} onClick={() => confirm('حذف هذه الصفحة نهائيًا؟') && remove.mutate(draft.id!, { onSuccess: () => { notify('حُذفت الصفحة.'); onClose(); }, onError: (e) => notify(e.message) })}><Trash2 size={14} />حذف</button>
            )}
            {draft.id && draft.status === 'published' && <a className="text-button" href={publicUrl(draft as AdminPage)} target="_blank"><Eye size={14} />عرض في الموقع</a>}
          </div>
          <div>
            <button className="button secondary" onClick={onClose}>إلغاء</button>
            <button className="button" onClick={submit} disabled={save.isPending}><Save size={16} />{save.isPending ? 'جارٍ الحفظ...' : 'حفظ'}</button>
          </div>
        </footer>
      </section>
    </div>
  );
}
