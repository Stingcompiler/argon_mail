'use client';
import { CheckCheck, Plus, ShieldCheck, SlidersHorizontal, UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUi } from '@/contexts/UiContext';
import { useSaveTeamMember, useTeam } from '@/hooks/admin';
import { fieldErrors } from '@/lib/api/client';
import type { Role } from '@/lib/api/types';
import { LoadError, Loading, Toggle, roleLabel, useDialogFocus } from './ui';

export function TeamManager() {
  const { user } = useAuth();
  const { notify } = useUi();
  const team = useTeam(user?.role === 'admin');
  const save = useSaveTeamMember();
  const [adding, setAdding] = useState(false);
  const update = (id: number, p: { role?: Role; is_active?: boolean }) => save.mutate({ id, ...p }, { onSuccess: () => notify('تم التحديث. يسري فورًا على جلسة العضو.'), onError: (e) => notify(e.message) });
  return (
    <>
      <div className="workspace-toolbar">
        <p className="subtle-copy">الفريق المناسب، والصلاحية المناسبة. الأعضاء يُعطّلون ولا يُحذفون حفاظًا على السجل.</p>
        <button className="button" onClick={() => setAdding(true)}><UserPlus size={17} />إضافة عضو</button>
      </div>
      <div className="role-cards">
        {[
          { title: 'المدير', text: 'كل الأقسام بما فيها الفريق والإعدادات.', icon: ShieldCheck },
          { title: 'المشغّل', text: 'الطلبات والخدمات والرسائل والمحتوى، دون الفريق.', icon: SlidersHorizontal },
          { title: 'المنفذ', text: 'الطلبات المسندة إليه فقط: الحالة والملاحظات.', icon: CheckCheck },
        ].map((r) => <article key={r.title}><r.icon size={23} /><h3>{r.title}</h3><p>{r.text}</p></article>)}
      </div>
      <section className="table-panel">
        <div className="panel-heading"><div><h2>أعضاء الفريق</h2><p>الصلاحيات مطبقة على الخادم.</p></div><span className="date-chip">{team.data?.length ?? '…'} أعضاء</span></div>
        {team.isLoading ? <Loading /> : team.isError ? <LoadError error={team.error} retry={() => team.refetch()} /> : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>العضو</th><th>البريد</th><th>الدور</th><th>مفعّل</th></tr></thead>
              <tbody>
                {team.data!.map((m) => (
                  <tr key={m.id}>
                    <td><span className="avatar">{m.full_name[0]}</span>{m.full_name}</td>
                    <td dir="ltr">{m.email}</td>
                    <td><select className="table-select" aria-label={'دور ' + m.full_name} value={m.role} disabled={m.id === user?.id} onChange={(e) => update(m.id, { role: e.target.value as Role })}>
                      {(Object.keys(roleLabel) as Role[]).map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
                    </select></td>
                    <td><Toggle label={'تفعيل ' + m.full_name} checked={m.is_active} disabled={m.id === user?.id} onChange={(v) => update(m.id, { is_active: v })} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {adding && <AddMember onClose={() => setAdding(false)} />}
    </>
  );
}

function AddMember({ onClose }: { onClose: () => void }) {
  const { notify } = useUi();
  const save = useSaveTeamMember();
  const [errors, setErrors] = useState<Record<string, string>>({});
  useDialogFocus(true, onClose, '.team-dialog');
  return (
    <div className="modal-backdrop">
      <form className="order-modal team-dialog" role="dialog" aria-modal="true" aria-label="عضو جديد" onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        save.mutate({ full_name: String(f.get('name')), email: String(f.get('email')), role: f.get('role') as Role, password: String(f.get('password')) }, {
          onSuccess: () => { notify('أُنشئ الحساب. سلّم كلمة المرور للعضو بطريقة آمنة.'); onClose(); },
          onError: (err) => setErrors(fieldErrors(err)),
        });
      }}>
        <div className="panel-heading"><h2>عضو جديد للفريق</h2><button type="button" className="icon-button" aria-label="إغلاق" onClick={onClose}><X /></button></div>
        <label>الاسم<input name="name" required maxLength={120} />{errors.full_name && <small className="field-error">{errors.full_name}</small>}</label>
        <label>البريد الإلكتروني<input name="email" type="email" dir="ltr" required autoComplete="off" />{errors.email && <small className="field-error">{errors.email}</small>}</label>
        <label>الدور<select name="role" defaultValue="operator"><option value="operator">مشغّل</option><option value="executor">منفذ</option><option value="admin">مدير</option></select></label>
        <label>كلمة مرور مبدئية<input name="password" type="password" dir="ltr" required minLength={10} autoComplete="new-password" /><small>10 أحرف على الأقل، وغير شائعة.</small>{errors.password && <small className="field-error">{errors.password}</small>}</label>
        <button className="button wide" disabled={save.isPending}>إضافة العضو <Plus size={16} /></button>
      </form>
    </div>
  );
}
