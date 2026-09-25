'use client';
import { ArrowDown, ArrowLeft, ArrowUp, Check, CircleHelp, Eye, EyeOff, FileText, Globe, Layers3, LockKeyhole, Pencil, Plus, Save, Search, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useUi } from '@/contexts/UiContext';
import { useCategories, useCategoryActions, useDeleteService, useSaveService, useServices, useSetServiceStatus } from '@/hooks/admin';
import { ApiError, fieldErrors } from '@/lib/api/client';
import type { AdminService, AdminServiceInput, FieldType, ServiceField } from '@/lib/api/types';
import { iconFor, serviceIcons } from '../icons';
import { AssetPicker } from './MediaLibrary';
import { LoadError, Loading, SectionTitle, Toggle, useDialogFocus } from './ui';

const FIELD_TYPES: { v: FieldType; l: string }[] = [
  { v: 'text', l: 'نص قصير' }, { v: 'textarea', l: 'نص طويل' }, { v: 'number', l: 'رقم' }, { v: 'date', l: 'تاريخ' },
  { v: 'select', l: 'اختيار واحد' }, { v: 'multiselect', l: 'اختيارات متعددة' }, { v: 'address', l: 'عنوان' },
  { v: 'file', l: 'ملف (PDF أو صورة)' }, { v: 'image', l: 'صورة' },
];
const STATUS_LABEL = { draft: 'مسودة', published: 'منشورة', hidden: 'مخفية' } as const;

type Draft = AdminServiceInput & { optionsText: Record<number, string> };

const blank = (category: number): Draft => ({
  category, name: '', slug: '', description: '', tagline: 'خدمة جديدة، عناية متجددة', requirements: '', duration_text: '',
  price_type: 'after_review', price_amount: null, price_currency: 'SDG', icon_key: 'package', image: null, color: 'sage', status: 'draft',
  is_featured: true, sort_order: 0, seo_title: '', seo_description: '', fields: [], optionsText: {},
});
const toDraft = (s: AdminService): Draft => ({
  ...s, fields: s.fields.map((f) => ({ ...f })), optionsText: Object.fromEntries(s.fields.map((f, i) => [i, f.options.join('، ')])),
});

export function ServicesManager() {
  const { notify } = useUi();
  const services = useServices();
  const categories = useCategories();
  const setStatus = useSetServiceStatus();
  const [tab, setTab] = useState<'services' | 'categories'>('services');
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<Draft | null>(null);

  const list = (services.data || []).filter((s) => (s.name + s.category_name).includes(search.trim()));
  const openNew = () => {
    const first = categories.data?.[0];
    if (!first) { notify('أضف مجالًا أولًا ثم أنشئ الخدمة.'); setTab('categories'); return; }
    setEditor(blank(first.id));
  };

  return (
    <>
      <div className="workspace-toolbar">
        <div className="segmented">
          <button className={tab === 'services' ? 'selected' : ''} onClick={() => setTab('services')}>الخدمات <b>{services.data?.length ?? '…'}</b></button>
          <button className={tab === 'categories' ? 'selected' : ''} onClick={() => setTab('categories')}>المجالات <b>{categories.data?.length ?? '…'}</b></button>
        </div>
        <button className="button" onClick={openNew}><Plus size={17} />إضافة خدمة</button>
      </div>
      {tab === 'services' ? (
        services.isLoading ? <Loading /> : services.isError ? <LoadError error={services.error} retry={() => services.refetch()} /> : <>
          <div className="workspace-search">
            <Search size={18} />
            <input aria-label="البحث في الخدمات" placeholder="ابحث بالاسم أو المجال..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <span>{list.length} خدمات</span>
          </div>
          <div className="management-grid">
            {list.map((s) => {
              const Icon = iconFor(s.icon_key);
              const published = s.status === 'published';
              return (
                <article className="managed-card" key={s.id}>
                  <div className={'managed-art ' + s.color}>
                    <Icon size={36} strokeWidth={1.3} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {s.image_data && <img className="managed-custom-image" src={s.image_data.url} alt={s.image_data.alt} loading="lazy" />}
                    <span className={'publish-pill ' + (published ? '' : 'draft')}>{STATUS_LABEL[s.status]}</span>
                    <small>{s.category_name}</small>
                  </div>
                  <div className="managed-body">
                    <h3>{s.name}</h3>
                    <p>{s.description}</p>
                    <div className="managed-meta"><span><FileText size={13} />{s.fields.length + 2} حقول</span><span>{s.price_label}</span></div>
                    <div className="managed-actions">
                      <button onClick={() => setEditor(toDraft(s))}><Pencil size={14} />تحرير الخدمة</button>
                      {published && <a title="عرض في الموقع" aria-label={'عرض ' + s.name} href={`/services/${encodeURIComponent(s.slug)}`} target="_blank"><Eye size={16} /></a>}
                      <button title={published ? 'إخفاء الخدمة' : 'نشر الخدمة'} aria-label={(published ? 'إخفاء ' : 'نشر ') + s.name} disabled={setStatus.isPending}
                        onClick={() => setStatus.mutate({ id: s.id, status: published ? 'hidden' : 'published' }, {
                          onSuccess: () => notify(published ? 'أُخفيت الخدمة عن الموقع. الطلبات السابقة تبقى قابلة للمتابعة.' : 'أصبحت الخدمة منشورة في الموقع.'),
                          onError: (e) => notify(e.message),
                        })}>
                        {published ? <EyeOff size={16} /> : <Globe size={16} />}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
            <button className="add-service-card" onClick={openNew}>
              <span><Plus size={27} /></span><h3>فكرة لخدمة جديدة؟</h3><p>أضف خدمتك، واختر ما تحتاجه من العميل.</p><b>إنشاء خدمة <ArrowLeft size={15} /></b>
            </button>
          </div>
        </>
      ) : <CategoriesPanel />}
      {editor && <ServiceEditor draft={editor} setDraft={setEditor} onClose={() => setEditor(null)} />}
    </>
  );
}

function CategoriesPanel() {
  const { notify } = useUi();
  const categories = useCategories();
  const { create, remove } = useCategoryActions();
  const [name, setName] = useState('');
  if (categories.isLoading) return <Loading />;
  if (categories.isError) return <LoadError error={categories.error} retry={() => categories.refetch()} />;
  return (
    <section className="editor-panel">
      <SectionTitle icon={Layers3} title="مجالاتك، كما تحتاجها" text="نظّم الخدمات في مجالات مرنة. لا يُحذف مجال يحتوي خدمات." />
      <form className="inline-create" onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        create.mutate(name.trim(), { onSuccess: () => { setName(''); notify('أضيف المجال.'); }, onError: (err) => notify(fieldErrors(err).name || err.message) });
      }}>
        <input aria-label="اسم المجال الجديد" value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم مجال جديد" required maxLength={80} />
        <button className="button" disabled={create.isPending}><Plus size={16} />إضافة مجال</button>
      </form>
      <div className="category-list">
        {categories.data!.map((c, i) => (
          <div key={c.id}>
            <span className="category-index">{String(i + 1).padStart(2, '0')}</span>
            <div><b>{c.name}</b><small>{c.services_count} خدمات</small></div>
            <button className="icon-button danger" aria-label={'حذف ' + c.name} disabled={!!c.services_count || remove.isPending}
              title={c.services_count ? 'انقل الخدمات أولًا' : 'حذف المجال'}
              onClick={() => remove.mutate(c.id, { onSuccess: () => notify('حُذف المجال.'), onError: (e) => notify(e.message) })}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function ServiceEditor({ draft, setDraft, onClose }: { draft: Draft; setDraft: (d: Draft) => void; onClose: () => void }) {
  const { notify } = useUi();
  const categories = useCategories();
  const save = useSaveService();
  const remove = useDeleteService();
  const [tab, setTab] = useState('general');
  const [errors, setErrors] = useState<Record<string, string>>({});
  useDialogFocus(true, onClose);
  const change = (p: Partial<Draft>) => setDraft({ ...draft, ...p });
  const setField = (i: number, p: Partial<ServiceField>) => change({ fields: draft.fields.map((f, j) => (j === i ? { ...f, ...p } : f)) });
  const move = (i: number, d: -1 | 1) => {
    const fields = [...draft.fields];
    const texts = { ...draft.optionsText };
    [fields[i], fields[i + d]] = [fields[i + d], fields[i]];
    [texts[i], texts[i + d]] = [texts[i + d], texts[i]];
    change({ fields, optionsText: texts });
  };

  const submit = () => {
    const { optionsText, image_data: _img, ...rest } = draft; // eslint-disable-line @typescript-eslint/no-unused-vars
    const payload: AdminServiceInput = {
      ...rest,
      price_amount: rest.price_type === 'after_review' ? null : rest.price_amount,
      fields: rest.fields.map((f, i) => ({
        ...f, options: ['select', 'multiselect'].includes(f.type) ? (optionsText[i] || '').split(/[,،\n]/).map((x) => x.trim()).filter(Boolean) : [],
      })),
    };
    setErrors({});
    save.mutate(payload, {
      onSuccess: (s) => { notify(s.status === 'published' ? 'حُفظت الخدمة وتظهر في الموقع خلال ثوانٍ.' : 'حُفظت الخدمة كمسودة.'); onClose(); },
      onError: (err) => {
        const fe = fieldErrors(err);
        setErrors(fe);
        const keys = Object.keys(fe);
        if (keys.some((k) => k.startsWith('fields'))) setTab('fields');
        else if (keys.some((k) => ['name', 'description', 'category', 'price_amount', 'price_currency'].includes(k))) setTab('general');
        else if (keys.length) setTab('publish');
        notify(err instanceof ApiError && err.status === 400 ? 'راجع الحقول المعلّمة.' : err.message);
      },
    });
  };
  const err = (k: string) => errors[k] && <small className="field-error" role="alert">{errors[k]}</small>;

  return (
    <div className="drawer-backdrop">
      <section className="service-drawer" role="dialog" aria-modal="true" aria-label="محرر الخدمة">
        <header>
          <div><span className="eyebrow">مساحة لتطوير خدماتك</span><h2>{draft.id ? 'تحرير الخدمة' : 'خدمة جديدة'}</h2></div>
          <button className="icon-button" aria-label="إغلاق محرر الخدمة" onClick={onClose}><X /></button>
        </header>
        <div className="editor-tabs" role="tablist">
          {[{ id: 'general', label: 'تفاصيل الخدمة', icon: FileText }, { id: 'fields', label: 'نموذج الطلب', icon: SlidersHorizontal }, { id: 'publish', label: 'العرض والنشر', icon: Globe }].map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'selected' : ''} onClick={() => setTab(t.id)}><t.icon size={16} />{t.label}</button>
          ))}
        </div>
        <div className="drawer-body">
          {tab === 'general' && <>
            <div className="form-row">
              <label>اسم الخدمة <em>*</em><input value={draft.name} maxLength={120} onChange={(e) => change({ name: e.target.value })} placeholder="اسم واضح يعبّر عن الخدمة" />{err('name')}</label>
              <label>المجال<select value={draft.category} onChange={(e) => change({ category: Number(e.target.value) })}>
                {(categories.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></label>
            </div>
            <label>وصف الخدمة <em>*</em><textarea rows={4} maxLength={4000} value={draft.description} onChange={(e) => change({ description: e.target.value })} placeholder="ما الذي تقدمه هذه الخدمة لعميلك؟" />{err('description')}</label>
            <label>المتطلبات<textarea rows={3} maxLength={4000} value={draft.requirements} onChange={(e) => change({ requirements: e.target.value })} placeholder="المستندات أو المعلومات التي يحتاجها العميل" /></label>
            <label>عبارة البطاقة<input value={draft.tagline} maxLength={120} onChange={(e) => change({ tagline: e.target.value })} /></label>
            <div className="form-row">
              <label>طريقة التسعير<select value={draft.price_type} onChange={(e) => change({ price_type: e.target.value as Draft['price_type'] })}>
                <option value="after_review">بعد مراجعة الطلب</option><option value="fixed">سعر ثابت</option><option value="starting_from">يبدأ من</option>
              </select></label>
              <label>المدة التقديرية<input value={draft.duration_text} maxLength={120} onChange={(e) => change({ duration_text: e.target.value })} placeholder="مثال: من 3 إلى 5 أيام عمل" /></label>
            </div>
            {draft.price_type !== 'after_review' && (
              <div className="form-row">
                <label>القيمة<input inputMode="decimal" dir="ltr" value={draft.price_amount ?? ''} onChange={(e) => change({ price_amount: e.target.value || null })} placeholder="0.00" />{err('price_amount')}</label>
                <label>العملة<select value={draft.price_currency} onChange={(e) => change({ price_currency: e.target.value })}>
                  <option value="SDG">جنيه سوداني · SDG</option><option value="USD">دولار · USD</option><option value="SAR">ريال سعودي · SAR</option>
                </select>{err('price_currency')}</label>
              </div>
            )}
          </>}
          {tab === 'fields' && <>
            <div className="field-intro"><h3>اطلب التفاصيل التي تحتاجها فقط.</h3><p>الاسم ورقم WhatsApp حقول أساسية في كل طلب. تعديل الحقول لا يغيّر الطلبات السابقة.</p></div>
            <div className="locked-fields"><span><LockKeyhole size={14} />الاسم الكامل</span><span><LockKeyhole size={14} />رقم WhatsApp</span></div>
            {err('fields')}
            {draft.fields.map((f, i) => (
              <div className="field-builder" key={f.key || `new-${i}`}>
                <div className="field-builder-head">
                  <span><SlidersHorizontal size={15} />الحقل {i + 1}</span>
                  <div>
                    <button aria-label="تحريك للأعلى" className="icon-button" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={14} /></button>
                    <button aria-label="تحريك للأسفل" className="icon-button" disabled={i === draft.fields.length - 1} onClick={() => move(i, 1)}><ArrowDown size={14} /></button>
                    <button aria-label={'حذف الحقل ' + f.label} className="icon-button danger" onClick={() => {
                      const texts: Record<number, string> = {};
                      draft.fields.forEach((_, j) => { if (j !== i) texts[j < i ? j : j - 1] = draft.optionsText[j]; });
                      change({ fields: draft.fields.filter((_, j) => j !== i), optionsText: texts });
                    }}><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="form-row">
                  <label>اسم الحقل<input value={f.label} maxLength={120} onChange={(e) => setField(i, { label: e.target.value })} />{err(`fields.${i}.label`)}</label>
                  <label>نوع الحقل<select value={f.type} onChange={(e) => setField(i, { type: e.target.value as FieldType })}>
                    {FIELD_TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
                  </select></label>
                </div>
                {(f.type === 'select' || f.type === 'multiselect') && (
                  <label>الخيارات، مفصولة بفاصلة<input value={draft.optionsText[i] || ''} placeholder="الخيار الأول، الخيار الثاني"
                    onChange={(e) => change({ optionsText: { ...draft.optionsText, [i]: e.target.value } })} />{err(`fields.${i}.options`)}</label>
                )}
                {(f.type === 'file' || f.type === 'image') && (
                  <label>عدد الملفات المسموح في هذا الحقل
                    <input type="number" min={1} max={10} value={f.max_files} onChange={(e) => setField(i, { max_files: Math.max(1, Math.min(10, Number(e.target.value) || 1)) })} />
                    <small>الحجم والعدد الكلي لكل طلب يُضبطان من الإعدادات.</small>{err(`fields.${i}.max_files`)}
                  </label>
                )}
                <label>نص المساعدة<input value={f.help_text} maxLength={240} onChange={(e) => setField(i, { help_text: e.target.value })} /></label>
                <div className="switch-row compact"><span>حقل مطلوب</span><Toggle checked={f.required} label={'إلزامية ' + f.label} onChange={(v) => setField(i, { required: v })} /></div>
              </div>
            ))}
            <button className="dashed-button" onClick={() => change({ fields: [...draft.fields, { key: '', label: '', help_text: '', type: 'text', required: false, options: [], max_length: 1000, max_files: 1 }] })}>
              <Plus size={18} />إضافة حقل إلى النموذج
            </button>
          </>}
          {tab === 'publish' && <>
            <AssetPicker label="صورة الخدمة (اختيارية)" value={draft.image} onChange={(id) => change({ image: id })} />
            <h3>مظهر البطاقة</h3>
            <label>الأيقونة</label>
            <div className="icon-picker">
              {Object.entries(serviceIcons).map(([key, Icon]) => (
                <button key={key} className={draft.icon_key === key ? 'selected' : ''} aria-label={key} aria-pressed={draft.icon_key === key} onClick={() => change({ icon_key: key })}><Icon size={26} /></button>
              ))}
            </div>
            <label>خلفية البطاقة</label>
            <div className="color-picker">
              {['sage', 'sand', 'blue', 'rose'].map((c) => (
                <button key={c} aria-label={c} aria-pressed={draft.color === c} className={c + ' ' + (draft.color === c ? 'selected' : '')} onClick={() => change({ color: c })}>{draft.color === c && <Check size={18} />}</button>
              ))}
            </div>
            <label>حالة النشر<select value={draft.status} onChange={(e) => change({ status: e.target.value as Draft['status'] })}>
              <option value="draft">مسودة (لا تظهر في الموقع)</option><option value="published">منشورة</option><option value="hidden">مخفية (تتوقف الطلبات الجديدة)</option>
            </select></label>
            <div className="switch-row"><div><b>إظهار في الرئيسية</b><p>ضمن الخدمات المختارة في الصفحة الرئيسية.</p></div><Toggle checked={draft.is_featured} label="إظهار في الرئيسية" onChange={(v) => change({ is_featured: v })} /></div>
            <h3>محركات البحث</h3>
            <label>رابط الخدمة (slug)<input dir="auto" value={draft.slug} maxLength={140} onChange={(e) => change({ slug: e.target.value })} placeholder="يُولَّد من الاسم تلقائيًا" />
              <small>تغيير الرابط ينشئ تحويلًا دائمًا من الرابط القديم.</small>{err('slug')}</label>
            <label>عنوان الصفحة<input value={draft.seo_title} maxLength={70} onChange={(e) => change({ seo_title: e.target.value })} placeholder={draft.name} /><small>{draft.seo_title.length}/70</small></label>
            <label>الوصف في نتائج البحث<textarea rows={2} maxLength={170} value={draft.seo_description} onChange={(e) => change({ seo_description: e.target.value })} placeholder={draft.description.slice(0, 160)} /><small>{draft.seo_description.length}/170</small></label>
            <div className="mini-preview">
              <div className={draft.color}>{(() => { const I = iconFor(draft.icon_key); return <I size={35} />; })()}</div>
              <section><small>{categories.data?.find((c) => c.id === draft.category)?.name}</small><h3>{draft.name || 'اسم خدمتك هنا'}</h3><p>{draft.tagline}</p></section>
            </div>
            <div className="design-tip"><CircleHelp size={17} /><span>أضف الصور أولًا من «مكتبة الوسائط» مع وصف لكل صورة. دون صورة تظهر الأيقونة واللون.</span></div>
          </>}
        </div>
        <footer className="drawer-footer">
          {draft.id ? (
            <button className="text-button" disabled={remove.isPending} onClick={() => {
              if (!confirm('حذف الخدمة نهائيًا؟ الخدمات التي لها طلبات لا تُحذف، بل تُخفى.')) return;
              remove.mutate(draft.id!, { onSuccess: () => { notify('حُذفت الخدمة.'); onClose(); }, onError: (e) => notify(e.message) });
            }}><Trash2 size={14} />حذف</button>
          ) : <span />}
          <div>
            <button className="button secondary" onClick={onClose}>إلغاء</button>
            <button className="button" onClick={submit} disabled={save.isPending}><Save size={16} />{save.isPending ? 'جارٍ الحفظ...' : 'حفظ الخدمة'}</button>
          </div>
        </footer>
      </section>
    </div>
  );
}
