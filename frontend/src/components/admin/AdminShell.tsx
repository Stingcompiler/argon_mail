'use client';
import { Bell, Clock3, FileText, Image as ImageIcon, LayoutTemplate, RotateCw, WifiOff, ExternalLink, Inbox, LayoutDashboard, Layers3, LoaderCircle, LogOut, MessageCircle, Settings, ShieldCheck, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Suspense, useEffect, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationSummary, useStorage } from '@/hooks/admin';
import { formatSize } from '@/lib/files';
import type { Role } from '@/lib/api/types';
import { LoginForm } from './LoginForm';
import { roleLabel, useDialogFocus } from './ui';

const NAV: { href: string; name: string; icon: typeof Inbox; roles: Role[] }[] = [
  { href: '/admin', name: 'نظرة عامة', icon: LayoutDashboard, roles: ['admin', 'operator', 'executor'] },
  { href: '/admin/orders', name: 'الطلبات', icon: Inbox, roles: ['admin', 'operator', 'executor'] },
  { href: '/admin/services', name: 'الخدمات والمجالات', icon: Layers3, roles: ['admin', 'operator'] },
  { href: '/admin/messages', name: 'الرسائل', icon: MessageCircle, roles: ['admin', 'operator'] },
  { href: '/admin/statuses', name: 'حالات الطلب', icon: Clock3, roles: ['admin', 'operator'] },
  { href: '/admin/notifications', name: 'تنبيهات البريد', icon: Bell, roles: ['admin', 'operator'] },
  { href: '/admin/media', name: 'مكتبة الوسائط', icon: ImageIcon, roles: ['admin', 'operator'] },
  { href: '/admin/pages', name: 'الصفحات', icon: FileText, roles: ['admin', 'operator'] },
  { href: '/admin/appearance', name: 'مظهر الموقع', icon: LayoutTemplate, roles: ['admin', 'operator'] },
  { href: '/admin/settings', name: 'المحتوى والإعدادات', icon: Settings, roles: ['admin', 'operator'] },
  { href: '/admin/team', name: 'الفريق والصلاحيات', icon: Users, roles: ['admin'] },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const { status, user, logout, bootstrap, retry } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => { bootstrap(); }, [bootstrap]);
  useEffect(() => {
    if (status === 'anonymous') router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
  }, [status, router, pathname]);
  useDialogFocus(status === 'expired', () => {}, '.relogin-dialog');
  const canSeeStorage = status === 'authenticated' && (user?.role === 'admin' || user?.role === 'operator');
  const storage = useStorage(canSeeStorage);
  const alerts = useNotificationSummary(canSeeStorage);

  if (status === 'offline') {
    return (
      <div className="admin-boot" role="alert">
        <WifiOff size={30} />
        <b>تعذّر الوصول إلى الخادم.</b>
        <span>تحقق من اتصالك بالإنترنت ثم أعد المحاولة.</span>
        <button className="button" onClick={retry}><RotateCw size={16} />إعادة المحاولة</button>
      </div>
    );
  }
  if (!user || status === 'unknown' || status === 'loading' || status === 'anonymous') {
    return <div className="admin-boot" role="status"><LoaderCircle className="spin" size={30} /><span>جارٍ التحقق من الجلسة...</span></div>;
  }
  const nav = NAV.filter((n) => n.roles.includes(user.role));
  const current = [...nav].reverse().find((n) => (n.href === '/admin' ? pathname === '/admin' : pathname.startsWith(n.href)));
  const allowed = nav.some((n) => n === current);

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Link className="logo-button" href="/admin">
          <span className="brand"><span className="brand-symbol"><ShieldCheck size={22} /></span><span>بريد عرجون<small>مساحة العمل</small></span></span>
        </Link>
        <span className="sidebar-label">مساحة العمل</span>
        {nav.map((n) => (
          <Link key={n.href} href={n.href} className={current === n ? 'active' : ''} aria-current={current === n ? 'page' : undefined}>
            <n.icon size={19} />{n.name}{n.href === '/admin/notifications' && !!alerts.data?.failed && <b>{alerts.data.failed}</b>}
          </Link>
        ))}
        <div className="sidebar-bottom">
          {storage.data && (
            <div className="storage">
              <span>مساحة التخزين <b>{formatSize(storage.data.used)} / {formatSize(storage.data.quota)}</b></span>
              <div style={{ ['--used' as string]: `${Math.min(100, storage.data.percent)}%` }} role="progressbar" aria-valuenow={storage.data.percent} aria-valuemin={0} aria-valuemax={100} aria-label="استهلاك التخزين" />
              <small className={storage.data.warning ? 'storage-warn' : undefined}>{storage.data.warning ? 'اقتربت المساحة من الامتلاء. راجع سياسة الاحتفاظ.' : 'مرفقات الطلبات الخاصة'}</small>
            </div>
          )}
          <Link href="/" target="_blank"><ExternalLink size={17} />عرض الموقع</Link>
          <button onClick={logout}><LogOut size={17} />تسجيل الخروج</button>
          <div className="admin-user">
            <span>{user.full_name[0]}</span>
            <div><b>{user.full_name}</b><small>{roleLabel[user.role]}</small></div>
            <ShieldCheck size={18} />
          </div>
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-top">
          <span>مساحة العمل <span>/</span> {current?.name}</span>
          <span className="admin-top-user">
            {canSeeStorage && (
              <Link className="icon-button bell" href="/admin/notifications" aria-label={alerts.data?.failed ? `${alerts.data.failed} تنبيهات فاشلة` : 'تنبيهات البريد'}>
                <Bell size={18} />{!!alerts.data?.failed && <i className="dot" />}
              </Link>
            )}
            <Clock3 size={15} />{roleLabel[user.role]} · {user.full_name}
          </span>
        </header>
        <div className="admin-content">
          {allowed ? <Suspense fallback={<div className="compact-empty" role="status"><LoaderCircle className="spin" size={28} /></div>}>{children}</Suspense> : <div className="compact-empty" role="alert"><h3>ليست لديك صلاحية لهذا القسم.</h3></div>}
        </div>
      </main>
      {status === 'expired' && (
        <div className="drawer-backdrop">
          <section className="order-modal relogin-dialog" role="dialog" aria-modal="true" aria-label="انتهت الجلسة">
            <LoginForm compact />
          </section>
        </div>
      )}
    </div>
  );
}

export function PageHeading({ title, text, eyebrow = 'لوحة تحكم بريد عرجون', children }: { title: string; text?: string; eyebrow?: string; children?: ReactNode }) {
  return (
    <div className="heading-row">
      <div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{text && <p>{text}</p>}</div>
      {children}
    </div>
  );
}
