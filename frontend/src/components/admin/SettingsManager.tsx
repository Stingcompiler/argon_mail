'use client';
import { CircleHelp, Globe, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUi } from '@/contexts/UiContext';
import { useFaq, useFaqActions, useSaveSiteSettings, useSiteSettings } from '@/hooks/admin';
import { fieldErrors } from '@/lib/api/client';
import type { FAQItem, SiteSettings } from '@/lib/api/types';
import { LoadError, Loading, SectionTitle, Toggle } from './ui';

export function SettingsManager() {
  const { user } = useAuth();
  const { notify } = useUi();
  const settings = useSiteSettings();
  const save = useSaveSiteSettings();
  const [draft, setDraft] = useState<SiteSettings | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => { if (settings.data && !draft) setDraft(settings.data); }, [settings.data, draft]);
  const canEdit = user?.role === 'admin';
  if (settings.isLoading || (!draft && !settings.isError)) return <Loading />;
  if (settings.isError) return <LoadError error={settings.error} retry={() => settings.refetch()} />;
  const d = draft!;
  const set = (p: Partial<SiteSettings>) => setDraft({ ...d, ...p });
  const input = (k: keyof SiteSettings, label: string, opts: { area?: boolean; ltr?: boolean; max?: number; hint?: string } = {}) => (
    <label>{label}
      {opts.area
        ? <textarea rows={3} maxLength={opts.max} value={String(d[k] ?? '')} disabled={!canEdit} onChange={(e) => set({ [k]: e.target.value })} />
        : <input dir={opts.ltr ? 'ltr' : undefined} maxLength={opts.max} value={String(d[k] ?? '')} disabled={!canEdit} onChange={(e) => set({ [k]: e.target.value })} />}
      {opts.hint && <small>{opts.hint}</small>}
      {errors[k] && <small className="field-error">{errors[k]}</small>}
    </label>
  );
  return (
    <div className="settings-layout single">
      <section className="editor-panel">
        <SectionTitle icon={Globe} title="الهوية والتواصل والرئيسية" text="تظهر في الموقع خلال ثوانٍ من الحفظ." />
        {!canEdit && <div className="notice">تعديل الإعدادات متاح للمدير فقط. يمكنك تحرير الأسئلة الشائعة أدناه.</div>}
        <div className="form-row">{input('name', 'اسم المنصة', { max: 80 })}{input('tagline', 'العبارة التعريفية', { max: 120 })}</div>
        <div className="form-row">{input('whatsapp_phone', 'رقم WhatsApp للمنصة', { ltr: true, hint: 'مع رمز الدولة. يظهر زر WhatsApp عند ضبطه.' })}{input('email', 'البريد الإلكتروني العام', { ltr: true })}</div>
        {input('whatsapp_text', 'نص بداية المحادثة', { area: true, max: 300 })}
        <div className="switch-row"><div><b>إظهار زر WhatsApp</b><p>زر عائم في صفحات الموقع العامة.</p></div><Toggle checked={d.show_whatsapp} disabled={!canEdit} onChange={(v) => set({ show_whatsapp: v })} label="إظهار زر واتساب" /></div>
        {input('address', 'العنوان', { max: 200 })}
        {input('hero_eyebrow', 'عبارة أعلى المقدمة', { max: 120 })}
        {input('hero_title', 'عنوان المقدمة', { area: true, max: 160, hint: 'سطر جديد لكل سطر في العنوان.' })}
        {input('hero_text', 'نص المقدمة', { area: true, max: 600 })}
        {input('about', 'نص صفحة عن المنصة', { area: true, max: 2000 })}
        <h3>محركات البحث</h3>
        {input('seo_title', 'عنوان الصفحة الرئيسية', { max: 70 })}
        {input('seo_description', 'وصف الموقع في نتائج البحث', { area: true, max: 170 })}
        {canEdit && (
          <div className="save-row">
            <span>{save.isSuccess ? 'تم الحفظ' : ''}</span>
            <button className="button" disabled={save.isPending} onClick={() => {
              setErrors({});
              save.mutate(d, { onSuccess: (s) => { setDraft(s); notify('حُفظت الإعدادات.'); }, onError: (e) => { setErrors(fieldErrors(e)); notify(e.message); } });
            }}><Save size={16} />حفظ الإعدادات</button>
          </div>
        )}
      </section>
      <FaqEditor />
    </div>
  );
}

function FaqEditor() {
  const { notify } = useUi();
  const faq = useFaq();
  const { save, remove } = useFaqActions();
  const [drafts, setDrafts] = useState<Record<number, Partial<FAQItem>>>({});
  const [adding, setAdding] = useState({ question: '', answer: '' });
  if (faq.isLoading) return <Loading />;
  if (faq.isError) return <LoadError error={faq.error} retry={() => faq.refetch()} />;
  return (
    <section className="editor-panel">
      <SectionTitle icon={CircleHelp} title="الأسئلة الشائعة" text="تظهر في الرئيسية وتُضاف لبيانات FAQPage المنظمة." />
      {faq.data!.map((f) => {
        const d = { ...f, ...drafts[f.id] };
        const dirty = !!drafts[f.id];
        return (
          <div className="field-builder" key={f.id}>
            <label>السؤال<input value={d.question} maxLength={200} onChange={(e) => setDrafts({ ...drafts, [f.id]: { ...drafts[f.id], question: e.target.value } })} /></label>
            <label>الإجابة<textarea rows={2} maxLength={2000} value={d.answer} onChange={(e) => setDrafts({ ...drafts, [f.id]: { ...drafts[f.id], answer: e.target.value } })} /></label>
            <div className="inline-actions">
              <span>منشور</span><Toggle checked={d.is_published} label="نشر السؤال" onChange={(v) => save.mutate({ id: f.id, is_published: v })} />
              <button className="button secondary" disabled={!dirty || save.isPending} onClick={() => save.mutate({ id: f.id, ...drafts[f.id] }, {
                onSuccess: () => { const n = { ...drafts }; delete n[f.id]; setDrafts(n); notify('حُفظ السؤال.'); }, onError: (e) => notify(e.message),
              })}><Save size={15} />حفظ</button>
              <button className="icon-button danger" aria-label="حذف السؤال" onClick={() => confirm('حذف هذا السؤال؟') && remove.mutate(f.id, { onError: (e) => notify(e.message) })}><Trash2 size={15} /></button>
            </div>
          </div>
        );
      })}
      <form className="field-builder" onSubmit={(e) => {
        e.preventDefault();
        save.mutate({ ...adding, sort_order: (faq.data!.at(-1)?.sort_order ?? 0) + 1, is_published: true }, {
          onSuccess: () => { setAdding({ question: '', answer: '' }); notify('أضيف السؤال.'); }, onError: (err) => notify(err.message),
        });
      }}>
        <label>سؤال جديد<input required maxLength={200} value={adding.question} onChange={(e) => setAdding({ ...adding, question: e.target.value })} /></label>
        <label>الإجابة<textarea required rows={2} maxLength={2000} value={adding.answer} onChange={(e) => setAdding({ ...adding, answer: e.target.value })} /></label>
        <button className="dashed-button" disabled={save.isPending}><Plus size={18} />إضافة السؤال</button>
      </form>
    </section>
  );
}
