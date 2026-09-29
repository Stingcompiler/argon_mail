'use client';
import { Bell, CircleHelp, Globe, LayoutTemplate, Plus, Save, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUi } from '@/contexts/UiContext';
import { useFaq, useFaqActions, useSaveSiteSettings, useSiteSettings } from '@/hooks/admin';
import { fieldErrors } from '@/lib/api/client';
import { SlidingGroup } from '@/lib/motion';
import type { FAQItem, SiteSettings } from '@/lib/api/types';
import { AssetPicker } from './MediaLibrary';
import { LoadError, Loading, SectionTitle, Toggle } from './ui';

const SECTIONS = [
  { id: 'identity', name: 'الهوية والتواصل' },
  { id: 'home', name: 'الصفحة الرئيسية' },
  { id: 'alerts', name: 'التنبيهات والملفات' },
  { id: 'seo', name: 'محركات البحث' },
  { id: 'faq', name: 'الأسئلة الشائعة' },
] as const;
type SectionId = (typeof SECTIONS)[number]['id'];

/**
 * Site settings in sections (one shared draft, so switching sections keeps
 * edits). A save bar appears at the bottom whenever there are unsaved
 * changes, and the browser warns before leaving the page with them.
 */
export function SettingsManager() {
  const { user } = useAuth();
  const { notify } = useUi();
  const settings = useSiteSettings();
  const save = useSaveSiteSettings();
  const [draft, setDraft] = useState<SiteSettings | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [section, setSection] = useState<SectionId>('identity');
  useEffect(() => { if (settings.data && !draft) setDraft(settings.data); }, [settings.data, draft]);
  // The notifications page links to #alerts.
  useEffect(() => { if (window.location.hash === '#alerts') setSection('alerts'); }, []);
  const dirty = !!draft && !!settings.data && JSON.stringify(draft) !== JSON.stringify(settings.data);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
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
  const submit = () => {
    setErrors({});
    save.mutate(d, {
      onSuccess: (s) => { setDraft(s); notify('حُفظت الإعدادات.'); },
      onError: (e) => {
        const errs = fieldErrors(e); setErrors(errs); notify(e.message);
        // Show the section holding the first invalid field.
        const where: Record<string, SectionId> = { hero_eyebrow: 'home', hero_title: 'home', hero_text: 'home', about: 'home', hero_image: 'home',
          notify_emails: 'alerts', max_file_mb: 'alerts', max_files_per_order: 'alerts', seo_title: 'seo', seo_description: 'seo' };
        const first = Object.keys(errs)[0];
        setSection(where[first] || 'identity');
      },
    });
  };
  return (
    <div className="settings-layout single">
      <SlidingGroup active={section} className="segmented settings-sections" role="group" aria-label="أقسام الإعدادات">
        {SECTIONS.map((t) => (
          <button key={t.id} type="button" className={section === t.id ? 'selected' : ''} aria-pressed={section === t.id} onClick={() => setSection(t.id)}>{t.name}</button>
        ))}
      </SlidingGroup>
      {section === 'faq' ? <FaqEditor /> : (
        <section className="editor-panel">
          {!canEdit && <div className="notice">تعديل الإعدادات متاح للمدير فقط. يمكنك تحرير الأسئلة الشائعة من قسمها.</div>}
          {section === 'identity' && (
            <>
              <SectionTitle icon={Globe} title="الهوية والتواصل" text="تظهر في الموقع خلال ثوانٍ من الحفظ." />
              {canEdit && <AssetPicker label="شعار المنصة" value={d.logo} onChange={(id) => set({ logo: id })} />}
              <div className="form-row">{input('name', 'اسم المنصة', { max: 80 })}{input('tagline', 'العبارة التعريفية', { max: 120 })}</div>
              <div className="form-row">{input('whatsapp_phone', 'رقم WhatsApp للمنصة', { ltr: true, hint: 'مع رمز الدولة. يظهر زر WhatsApp عند ضبطه.' })}{input('email', 'البريد الإلكتروني العام', { ltr: true })}</div>
              {input('whatsapp_text', 'نص بداية المحادثة', { area: true, max: 300 })}
              <div className="switch-row"><div><b>إظهار زر WhatsApp</b><p>زر عائم في صفحات الموقع العامة.</p></div><Toggle checked={d.show_whatsapp} disabled={!canEdit} onChange={(v) => set({ show_whatsapp: v })} label="إظهار زر واتساب" /></div>
              {input('address', 'العنوان', { max: 200 })}
            </>
          )}
          {section === 'home' && (
            <>
              <SectionTitle icon={LayoutTemplate} title="الصفحة الرئيسية" text="المقدمة ونص صفحة «عن المنصة»." />
              {canEdit && <AssetPicker label="صورة المقدمة في الرئيسية" value={d.hero_image} onChange={(id) => set({ hero_image: id })} />}
              {input('hero_eyebrow', 'عبارة أعلى المقدمة', { max: 120 })}
              {input('hero_title', 'عنوان المقدمة', { area: true, max: 160, hint: 'سطر جديد لكل سطر في العنوان.' })}
              {input('hero_text', 'نص المقدمة', { area: true, max: 600 })}
              {input('about', 'نص صفحة عن المنصة', { area: true, max: 2000 })}
            </>
          )}
          {section === 'alerts' && (
            <>
              <SectionTitle icon={Bell} title="التنبيهات والملفات" text="بريد تنبيهات الإدارة وحدود المرفقات." />
              <h3 id="alerts">تنبيهات البريد للإدارة</h3>
              {input('notify_emails', 'البريد المستلم للتنبيهات', { ltr: true, max: 500, hint: 'عنوان أو أكثر مفصولة بفاصلة. يصل تنبيه مختصر برابط، دون بيانات العميل.' })}
              <div className="switch-row"><div><b>تنبيه عند طلب جديد</b></div><Toggle checked={!!d.notify_orders} disabled={!canEdit} onChange={(v) => set({ notify_orders: v })} label="تنبيه الطلبات" /></div>
              <div className="switch-row"><div><b>تنبيه عند رسالة جديدة</b></div><Toggle checked={!!d.notify_messages} disabled={!canEdit} onChange={(v) => set({ notify_messages: v })} label="تنبيه الرسائل" /></div>
              <h3>الملفات المرفقة</h3>
              <div className="form-row">
                <label>حجم الملف الأقصى (MB)<input type="number" min={1} max={20} value={d.max_file_mb} disabled={!canEdit} onChange={(e) => set({ max_file_mb: Number(e.target.value) })} />{errors.max_file_mb && <small className="field-error">{errors.max_file_mb}</small>}</label>
                <label>عدد الملفات لكل طلب<input type="number" min={1} max={10} value={d.max_files_per_order} disabled={!canEdit} onChange={(e) => set({ max_files_per_order: Number(e.target.value) })} />{errors.max_files_per_order && <small className="field-error">{errors.max_files_per_order}</small>}</label>
              </div>
              <p className="subtle-copy">الأنواع المقبولة: PDF وPNG وJPG وWebP، ويُتحقق من محتوى الملف الفعلي. الحد الأعلى على الخادم 20 MB و10 ملفات.</p>
            </>
          )}
          {section === 'seo' && (
            <>
              <SectionTitle icon={Search} title="محركات البحث" text="كيف تظهر الرئيسية في نتائج البحث وعند المشاركة." />
              {input('seo_title', 'عنوان الصفحة الرئيسية', { max: 70 })}
              {input('seo_description', 'وصف الموقع في نتائج البحث', { area: true, max: 170 })}
            </>
          )}
        </section>
      )}
      {canEdit && dirty && (
        <div className="save-bar" role="region" aria-label="تعديلات غير محفوظة">
          <span>لديك تعديلات غير محفوظة.</span>
          <div>
            <button type="button" className="button secondary" disabled={save.isPending} onClick={() => { setDraft(settings.data!); setErrors({}); }}>تراجع</button>
            <button type="button" className="button" disabled={save.isPending} aria-busy={save.isPending} onClick={submit}><Save size={16} />{save.isPending ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}</button>
          </div>
        </div>
      )}
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
