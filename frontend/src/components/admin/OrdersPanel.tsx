'use client';
import { ArrowUpLeft, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders, useStaff, useStatuses } from '@/hooks/admin';
import type { OrderFilters } from '@/lib/api/types';
import { formatDate } from '@/lib/format';
import { OrderDrawer } from './OrderDrawer';
import { LoadError, Loading, StatusBadge } from './ui';

function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

export function OrdersPanel({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const [filters, setFilters] = useState<OrderFilters>({ page: 1 });
  const [q, setQ] = useState('');
  const query = useDebounced(q);
  const effective = { ...filters, q: query || undefined };
  const orders = useOrders(effective);
  const statuses = useStatuses();
  const staff = useStaff();
  const [selected, setSelected] = useState<number | null>(null);
  const set = (p: Partial<OrderFilters>) => setFilters({ ...filters, ...p, page: p.page ?? 1 });
  useEffect(() => { setFilters((f) => ({ ...f, page: 1 })); }, [query]);
  const data = orders.data;
  const pages = data ? Math.max(1, Math.ceil(data.count / 25)) : 1;
  const filtered = Object.entries(effective).some(([k, v]) => k !== 'page' && v);

  return (
    <section className="table-panel">
      <div className="panel-heading">
        <div><h2>{compact ? 'أحدث الطلبات' : 'إدارة الطلبات'}</h2><p>{data ? `${data.count} طلب` : 'كل المعلومات التي تحتاجها للخطوة التالية.'}</p></div>
        <div className="table-search"><Search size={17} /><input aria-label="بحث في الطلبات" placeholder="رقم الطلب أو الاسم أو الهاتف..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      {!compact && (
        <div className="panel-heading filters-row">
          <select aria-label="الحالة" className="table-select" value={filters.status || ''} onChange={(e) => set({ status: e.target.value || undefined })}>
            <option value="">كل الحالات</option>
            {(statuses.data || []).map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          {user?.role !== 'executor' && (
            <select aria-label="المسؤول" className="table-select" value={filters.assignee || ''} onChange={(e) => set({ assignee: e.target.value || undefined })}>
              <option value="">كل المسؤولين</option>
              <option value="me">المسندة إليّ</option>
              <option value="none">غير مسندة</option>
              {(staff.data || []).map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          )}
          <label className="subtle-copy">من <input type="date" value={filters.created_after || ''} onChange={(e) => set({ created_after: e.target.value || undefined })} /></label>
          <label className="subtle-copy">إلى <input type="date" value={filters.created_before || ''} onChange={(e) => set({ created_before: e.target.value || undefined })} /></label>
        </div>
      )}
      {orders.isLoading ? <Loading /> : orders.isError ? <LoadError error={orders.error} retry={() => orders.refetch()} /> : (
        <>
          <div className="table-scroll" aria-busy={orders.isFetching}>
            <table>
              <thead><tr><th>رقم الطلب</th><th>العميل</th><th>الخدمة</th><th>الحالة</th><th>المسؤول</th><th>التاريخ</th><th /></tr></thead>
              <tbody>
                {data!.results.map((o) => (
                  <tr key={o.id} onClick={() => setSelected(o.id)}>
                    <td className="order-id" dir="ltr">{o.code}</td>
                    <td><span className="avatar">{o.customer_name[0]}</span>{o.customer_name}</td>
                    <td>{o.service_name}</td>
                    <td><StatusBadge meaning={o.status.meaning} label={o.status.label} /></td>
                    <td className="muted">{o.assignee?.full_name || '—'}</td>
                    <td className="muted">{formatDate(o.created_at)}</td>
                    <td><button className="icon-button" aria-label={'عرض ' + o.code} onClick={(e) => { e.stopPropagation(); setSelected(o.id); }}><ArrowUpLeft size={17} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!data!.results.length && (
            <div className="compact-empty">
              <Search size={30} />
              <h3>{filtered ? 'لا توجد طلبات مطابقة' : 'لا توجد طلبات بعد'}</h3>
              {filtered && <button className="text-button" onClick={() => { setQ(''); setFilters({ page: 1 }); }}>إزالة عوامل التصفية</button>}
            </div>
          )}
          {!compact && pages > 1 && (
            <div className="pagination">
              <button className="button secondary" disabled={(filters.page || 1) <= 1} onClick={() => set({ page: (filters.page || 1) - 1 })}>السابق</button>
              <span className="subtle-copy">صفحة {filters.page || 1} من {pages}</span>
              <button className="button secondary" disabled={(filters.page || 1) >= pages} onClick={() => set({ page: (filters.page || 1) + 1 })}>التالي</button>
            </div>
          )}
        </>
      )}
      {selected !== null && <OrderDrawer id={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}
