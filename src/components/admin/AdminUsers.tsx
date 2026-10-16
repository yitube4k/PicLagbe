import React, { useState, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../lib/types';
import { bnDate } from '../../lib/utils';
import {
  AdminSheet, FullDialog, ConfirmDialog, FilterBar, IconAction, OverflowMenu,
  Field, StatusPill, EmptyState, ListSkeleton, KV, ProgressiveRows, waMe, telHref,
  useAdminList, useSnack, useOptimistic,
} from './kit';
import { logAction } from '../../lib/audit';
import { AIcon } from '../../admin/icons';

/**
 * USERS — Android style (Argon spec): card tap = view sheet, 3-dot menu =
 * edit / role change / delete. Optimistic role switch, zero-skeleton.
 */
export default function AdminUsers({ onChanged }: { onChanged?: () => void }) {
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const debouncedQ = useRef(''); // set by FilterBar onChange through state below
  const [qNow, setQNow] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetcher = useCallback(async () => {
    let query = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (debouncedQ.current.trim()) query = query.or(`full_name.ilike.%${debouncedQ.current.trim()}%,email.ilike.%${debouncedQ.current.trim()}%`);
    if (roleFilter) query = query.eq('role', roleFilter);
    const { data } = await query;
    return (data as Profile[]) || [];
  }, [roleFilter]);

  const list = useAdminList<Profile>(fetcher, [roleFilter]);
  const { show } = useSnack();
  const opt = useOptimistic();

  // search debounce — silent reload, no skeleton
  const onQ = useCallback((v: string) => {
    setQ(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debouncedQ.current = v;
      setQNow((n) => n + 1); // trigger fetcher re-run
    }, 350);
  }, []);
  React.useEffect(() => { if (qNow) list.silentReload(); }, [qNow]); // eslint-disable-line react-hooks/exhaustive-deps

  const [viewing, setViewing] = useState<Profile | null>(null);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState<Profile | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null); // role menu inside overflow

  // edit form
  const [fName, setFName] = useState('');
  const [fPhone, setFPhone] = useState('');
  const [fWa, setFWa] = useState('');
  const [fBio, setFBio] = useState('');
  const [fAvatar, setFAvatar] = useState('');
  const [fRole, setFRole] = useState<Profile['role']>('customer');
  const [fEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const dirtyRef = useRef(false);

  const openEdit = (u: Profile) => {
    setEditing(u);
    setFName(u.full_name || '');
    setFPhone(u.phone || '');
    setFWa(u.whatsapp || '');
    setFBio(u.bio || '');
    setFAvatar(u.avatar_url || '');
    setFRole(u.role || 'customer');
    dirtyRef.current = false;
    setErr(null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    setErr(null);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fName.trim() || null,
        phone: fPhone.trim() || null,
        whatsapp: fWa.trim() || null,
        bio: fBio.trim() || null,
        avatar_url: fAvatar.trim() || null,
        role: fRole,
      })
      .eq('id', editing.id);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    const roleChanged = fRole !== (editing.role || 'customer');
    logAction(roleChanged ? 'role_change' : 'update', 'user', editing.id, fName.trim() || editing.email || 'ইউজার', {
      note: roleChanged ? `রোল: ${editing.role || 'customer'} → ${fRole}` : 'প্রোফাইল এডিট (নাম/ফোন/WhatsApp/বায়ো/অ্যাভাটার)',
      before: { role: editing.role || 'customer' },
      after: { role: fRole },
    });
    list.patch(editing.id, {
      full_name: fName.trim() || null, phone: fPhone.trim() || null, whatsapp: fWa.trim() || null,
      bio: fBio.trim() || null, avatar_url: fAvatar.trim() || null, role: fRole,
    } as Partial<Profile>);
    setEditing(null);
    show('প্রোফাইল সেভ হয়েছে');
    onChanged?.();
    list.silentReload();
  };

  /** optimistic role switch from overflow menu */
  const changeRole = async (u: Profile, role: Profile['role']) => {
    if (role === u.role) return;
    const oldRole = u.role;
    const ok = await opt.run({
      patchFn: () => list.patch(u.id, { role } as Partial<Profile>),
      mutate: () => supabase.from('profiles').update({ role }).eq('id', u.id),
      okMsg: `${u.full_name || u.email || 'ইউজার'} → ${role === 'admin' ? 'অ্যাডমিন' : role === 'photographer' ? 'ফটোগ্রাফার' : 'ইউজার'}`,
      reload: () => list.silentReload(),
    });
    if (ok) {
      logAction('role_change', 'user', u.id, u.full_name || u.email || 'ইউজার', {
        note: `রোল: ${oldRole} → ${role}`,
        before: { role: oldRole }, after: { role },
      });
      onChanged?.();
    }
  };

  const deleteUser = async () => {
    if (!deleting) return;
    setBusyDelete(true);
    const { error } = await supabase.from('profiles').delete().eq('id', deleting.id);
    setBusyDelete(false);
    if (error) { show('ডিলিট ব্যর্থ: ' + error.message, { tone: 'error' }); return; }
    logAction('delete', 'user', deleting.id, deleting.full_name || deleting.email || 'ইউজার', {
      note: `ইউজার ডিলিট (${deleting.email || deleting.id})`,
      meta: { email: deleting.email, role: deleting.role },
    });
    list.remove(deleting.id);
    show('ইউজার মুছে ফেলা হয়েছে');
    setDeleting(null);
    setViewing((v) => (v && deleting && v.id === deleting.id ? null : v));
    onChanged?.();
  };

  return (
    <div>
      <FilterBar
        q={q}
        onQ={onQ}
        placeholder="নাম বা ইমেইল খুঁজুন…"
        chips={[
          { key: '', label: 'সব' },
          { key: 'customer', label: 'ইউজার' },
          { key: 'photographer', label: 'ফটোগ্রাফার' },
          { key: 'admin', label: 'অ্যাডমিন' },
        ]}
        activeChip={roleFilter}
        onChip={setRoleFilter}
      />

      {list.error && <p className="text-sm text-rose-300 mb-3">{list.error}</p>}

      {list.loading ? (
        <ListSkeleton />
      ) : list.items.length === 0 ? (
        <EmptyState icon="👥" title="কোনো ইউজার পাওয়া যায়নি" sub="সার্চ বা ফিল্টার বদলে দেখুন।" />
      ) : (
        <ProgressiveRows
          items={list.items}
          resetKey={roleFilter}
          renderRow={(u) => {
            const wa = waMe(u.whatsapp || u.phone);
            return (
              <div key={u.id} className={`glass rounded-xl2 p-3.5 flex items-center gap-3 ${list.shakeId === u.id ? 'admin-shake' : ''}`}>
                {/* card tap → view */}
                <button type="button" onClick={() => setViewing(u)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-sunset-gold/30 shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-sunset-gradient flex items-center justify-center text-sm font-extrabold text-[#1A0E06] shrink-0">
                      {(u.full_name || 'ই').slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-white text-[14.5px] truncate">{u.full_name || '(নাম নেই)'}</span>
                      <StatusPill status={u.role} />
                    </div>
                    <span className="text-[12.5px] text-white/50 truncate block mt-0.5">
                      {u.email || u.id} · {bnDate(u.created_at)}
                    </span>
                  </div>
                </button>
                {/* visible slot: WhatsApp when available; rest in 3-dot */}
                {wa ? (
                  <a href={wa} target="_blank" rel="noreferrer" aria-label="WhatsApp মেসেজ" title="WhatsApp মেসেজ"
                    className="w-11 h-11 rounded-full grid place-items-center text-emerald-300 hover:bg-emerald-400/15 transition-colors active:scale-90 shrink-0">
                    <AIcon name="whatsapp" size={20} strokeWidth={1.9} />
                  </a>
                ) : null}
                <OverflowMenu
                  items={[
                    { icon: 'eye', label: 'বিস্তারিত দেখুন', onClick: () => setViewing(u) },
                    { icon: 'edit', label: 'এডিট করুন', onClick: () => openEdit(u) },
                    { icon: 'users', label: 'রোল বদলান', divider: true },
                    { icon: 'users', label: 'ইউজার করুন', checked: u.role === 'customer', hide: u.role === 'customer', onClick: () => changeRole(u, 'customer') },
                    { icon: 'camera', label: 'ফটোগ্রাফার করুন', checked: u.role === 'photographer', hide: u.role === 'photographer', onClick: () => changeRole(u, 'photographer') },
                    { icon: 'shield', label: 'অ্যাডমিন করুন', checked: u.role === 'admin', hide: u.role === 'admin', onClick: () => changeRole(u, 'admin') },
                    { icon: 'trash', label: 'ডিলিট করুন', danger: true, divider: true, hide: u.role === 'admin', onClick: () => setDeleting(u) },
                  ]}
                />
              </div>
            );
          }}
        />
      )}

      {/* VIEW SHEET */}
      <AdminSheet
        open={!!viewing}
        onClose={() => setViewing(null)}
        header={
          viewing ? (
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {viewing.avatar_url ? (
                <img src={viewing.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-sunset-gold/30 shrink-0" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-sunset-gradient grid place-items-center text-sm font-extrabold text-[#1A0E06] shrink-0">
                  {(viewing.full_name || 'ই').slice(0, 1)}
                </div>
              )}
              <div className="min-w-0">
                <h3 className="font-extrabold text-white text-[16px] leading-snug truncate">{viewing.full_name || '(নাম নেই)'}</h3>
                <div className="mt-0.5"><StatusPill status={viewing.role} /></div>
              </div>
            </div>
          ) : undefined
        }
        footer={
          viewing && (
            <>
              <button type="button" onClick={() => openEdit(viewing)} className="btn-primary flex-1 justify-center">
                <AIcon name="edit" size={16} strokeWidth={2} className="mr-1.5" /> এডিট করুন
              </button>
              {waMe(viewing.whatsapp || viewing.phone) && (
                <a href={waMe(viewing.whatsapp || viewing.phone)!} target="_blank" rel="noreferrer"
                  className="h-11 w-11 rounded-full grid place-items-center bg-emerald-400/15 border border-emerald-400/30 text-emerald-300 active:scale-90 transition-transform" aria-label="WhatsApp">
                  <AIcon name="whatsapp" size={19} strokeWidth={1.9} />
                </a>
              )}
              {telHref(viewing.phone) && (
                <a href={telHref(viewing.phone)!} className="h-11 w-11 rounded-full grid place-items-center bg-white/[0.06] border border-white/10 text-white/70 active:scale-90 transition-transform" aria-label="কল করুন">
                  <AIcon name="phone" size={18} strokeWidth={1.9} />
                </a>
              )}
            </>
          )
        }
      >
        {viewing && (
          <div>
            <KV k="ইমেইল" v={viewing.email} mono />
            <KV k="ফোন" v={viewing.phone || '—'} />
            <KV k="WhatsApp" v={viewing.whatsapp || '—'} />
            <KV k="যোগদান" v={bnDate(viewing.created_at)} />
            <KV k="ইউজার আইডি" v={<span className="break-all">{viewing.id}</span>} mono />
            {viewing.bio && (
              <div className="mt-3">
                <p className="field-label">বায়ো</p>
                <p className="text-[13.5px] text-white/80 leading-relaxed mt-1 whitespace-pre-line">{viewing.bio}</p>
              </div>
            )}
          </div>
        )}
      </AdminSheet>

      {/* EDIT FULL DIALOG */}
      <FullDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        title="ইউজার এডিট"
        sub={editing?.email || ''}
        onSave={saveEdit}
        saving={saving}
        dirty={dirtyRef.current}
        err={err}
      >
        <div
          onInput={() => { dirtyRef.current = true; }}
          className="space-y-4"
        >
          <Field label="পুরো নাম">
            <input value={fName} onChange={(e) => { setFName(e.target.value); dirtyRef.current = true; }} className="glass-input !text-base" />
          </Field>
          <Field label="ইমেইল (শুধু দেখার জন্য)">
            <input value={fEmail || editing?.email || ''} disabled className="glass-input opacity-60 !text-base" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="ফোন">
              <input value={fPhone} onChange={(e) => { setFPhone(e.target.value); dirtyRef.current = true; }} className="glass-input !text-base" placeholder="01XXXXXXXXX" inputMode="tel" />
            </Field>
            <Field label="WhatsApp">
              <input value={fWa} onChange={(e) => { setFWa(e.target.value); dirtyRef.current = true; }} className="glass-input !text-base" placeholder="01XXXXXXXXX" inputMode="tel" />
            </Field>
          </div>
          <Field label="বায়ো">
            <textarea value={fBio} onChange={(e) => { setFBio(e.target.value); dirtyRef.current = true; }} rows={3} className="glass-input resize-y !text-base" />
          </Field>
          <Field label="অ্যাভাটার URL">
            <input value={fAvatar} onChange={(e) => { setFAvatar(e.target.value); dirtyRef.current = true; }} className="glass-input !text-base" placeholder="https://…" inputMode="url" />
          </Field>
          <Field label="রোল" hint="রোল বদলালে ইউজারের অ্যাক্সেস সাথে সাথে বদলাবে">
            <select value={fRole} onChange={(e) => { setFRole(e.target.value as Profile['role']); dirtyRef.current = true; }} className="glass-select !text-base">
              <option value="customer">ইউজার</option>
              <option value="photographer">ফটোগ্রাফার</option>
              <option value="admin">অ্যাডমিন</option>
            </select>
          </Field>
        </div>
      </FullDialog>

      {/* DELETE CONFIRM (M3) */}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={deleteUser}
        busy={busyDelete}
        title={`${deleting?.full_name || deleting?.email || 'ইউজার'}-কে মুছে ফেলবেন?`}
        body="প্রোফাইল স্থায়ীভাবে মুছে যাবে — এটি ফিরিয়ে আনা যাবে না।"
        confirmLabel="মুছে ফেলুন"
      />
    </div>
  );
}
