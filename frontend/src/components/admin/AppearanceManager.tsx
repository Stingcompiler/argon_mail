'use client';
import { ArrowDown, ArrowUp, LayoutTemplate, Navigation, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUi } from '@/contexts/UiContext';
import { usePages, useSaveSiteSettings, useSiteSettings } from '@/hooks/admin';
import { fieldErrors } from '@/lib/api/client';
import type { HomeSection, NavItem } from '@/lib/api/types';
import { LoadError, Loading, SectionTitle, Toggle } from './ui';

const SECTION_LABEL: Record<HomeSection['key'], string> = { services: 'الخدمات المختارة', how: 'خطوات الاستخدام', faq: 'الأسئلة الشائعة' };
const FIXED_LINKS = [
  { href: '/', label: 'الرئيسية' }, { href: '/services', label: 'الخدمات' }, { href: '/about', label: 'عن المنصة' },
  { href: '/contact', label: 'تواصل معنا' }, { href: '/track', label: 'متابعة الطلب' },
];

function move<T>(list: T[], i: number, d: -1 | 1) {
  const next = [...list];
  [next[i], next[i + d]] = [next[i + d], next[i]];
  return next;
}

export function AppearanceManager() {
  const { user } = useAuth();
  const { notify } = useUi();
  const settings = useSiteSettings();
  const pages = usePages();
  const save = useSaveSiteSettings();
  const [nav, setNav] = useState<NavItem[] | null>(null);
  const [sections, setSections] = useState<HomeSection[] | null>(null);
  useEffect(() => {
    if (settings.data && nav === null) { setNav(settings.data.navigation); setSections(settings.data.home_sections); }
  }, [settings.data, nav]);
  const canEdit = user?.role === 'admin';
  if (settings.isLoading || !nav || !sections) return settings.isError ? <LoadError error={settings.error} retry={() => settings.refetch()} /> : <Loading />;

  const targets = [
    ...FIXED_LINKS,
    ...(pages.data || []).filter((p) => p.status === 'published').map((p) => ({
      href: p.is_system ? `/${p.slug}` : `/p/${encodeURIComponent(p.slug)}`, label: `صفحة: ${p.title}`,
    })),
  ];
  const submit = () => save.mutate({ navigation: nav, home_sections: sections }, {
    onSuccess: (s) => { setNav(s.navigation); setSections(s.home_sections); notify('حُفظ المظهر ويظهر في الموقع خلال ثوانٍ.'); },
    onError: (e) => { const fe = fieldErrors(e); notify(fe.navigation || fe.home_sections || e.message); },
  });

  return (
    <>
      {!canEdit && <div className="notice">تعديل المظهر متاح للمدير فقط.</div>}
      <section className="editor-panel">
        <SectionTitle icon={Navigation} title="روابط القائمة الرئيسية" text="الاسم الذي يظهر، والصفحة التي يفتحها، وترتيبه. الروابط داخلية فقط." />
        {nav.map((n, i) => (
          <div className="field-builder" key={i}>
            <div className="field-builder-head">
              <span>الرابط {i + 1}</span>
              <div>
                <button className="icon-button" aria-label="تحريك للأعلى" disabled={!canEdit || i === 0} onClick={() => setNav(move(nav, i, -1))}><ArrowUp size={14} /></button>
                <button className="icon-button" aria-label="تحريك للأسفل" disabled={!canEdit || i === nav.length - 1} onClick={() => setNav(move(nav, i, 1))}><ArrowDown size={14} /></button>
                <button className="icon-button danger" aria-label={`حذف ${n.label}`} disabled={!canEdit || nav.length === 1} onClick={() => setNav(nav.filter((_, j) => j !== i))}><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="form-row">
              <label>الاسم<input value={n.label} maxLength={30} disabled={!canEdit} onChange={(e) => setNav(nav.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} /></label>
              <label>يفتح<select value={n.href} disabled={!canEdit} onChange={(e) => setNav(nav.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)))}>
                {!targets.some((t) => t.href === n.href) && <option value={n.href}>{n.href}</option>}
                {targets.map((t) => <option key={t.href} value={t.href}>{t.label}</option>)}
              </select></label>
            </div>
            <div className="switch-row compact"><span>ظاهر في القائمة</span>
              <Toggle checked={n.enabled} disabled={!canEdit} label={`إظهار ${n.label}`} onChange={(v) => setNav(nav.map((x, j) => (j === i ? { ...x, enabled: v } : x)))} /></div>
          </div>
        ))}
        {canEdit && nav.length < 8 && (
          <button className="dashed-button" onClick={() => setNav([...nav, { label: 'رابط جديد', href: '/services', enabled: true }])}><Plus size={18} />إضافة رابط</button>
        )}
      </section>
      <section className="editor-panel">
        <SectionTitle icon={LayoutTemplate} title="أقسام الصفحة الرئيسية" text="المقدمة ومربع متابعة الطلب يظهران أولًا دائمًا؛ رتّب الباقي أو أخفه." />
        <div className="category-list">
          {sections.map((s, i) => (
            <div key={s.key}>
              <span className="category-index">{String(i + 1).padStart(2, '0')}</span>
              <div><b>{SECTION_LABEL[s.key]}</b><small>{s.visible ? 'ظاهر' : 'مخفي'}</small></div>
              <div className="inline-actions">
                <button className="icon-button" aria-label="تحريك للأعلى" disabled={!canEdit || i === 0} onClick={() => setSections(move(sections, i, -1))}><ArrowUp size={14} /></button>
                <button className="icon-button" aria-label="تحريك للأسفل" disabled={!canEdit || i === sections.length - 1} onClick={() => setSections(move(sections, i, 1))}><ArrowDown size={14} /></button>
                <Toggle checked={s.visible} disabled={!canEdit} label={`إظهار ${SECTION_LABEL[s.key]}`} onChange={(v) => setSections(sections.map((x, j) => (j === i ? { ...x, visible: v } : x)))} />
              </div>
            </div>
          ))}
        </div>
      </section>
      {canEdit && (
        <div className="save-row"><span /><button className="button" disabled={save.isPending} onClick={submit}><Save size={16} />{save.isPending ? 'جارٍ الحفظ...' : 'حفظ المظهر'}</button></div>
      )}
    </>
  );
}
