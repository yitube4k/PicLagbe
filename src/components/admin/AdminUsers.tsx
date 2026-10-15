import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../lib/types';
import { bnDate } from '../../lib/utils';
import { AdminModal, Field, StatusPill, EmptyState, SectionHead, DangerConfirm } from './kit';

/**
 * USERS — full control: সার্চ, সব ফিল্ড এডিট (নাম/ফোন/WhatsApp/বায়ো/অ্যাভাটার/রোল), ডিলিট।
 */
export default function AdminUsers({ onChanged }: { onChanged?: () => void }) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [editing, setEditing] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // edit form
  const [fName, setFName] = useState('');
  const [fPhone, setFPhone] = useState('');
  const [fWa, setFWa] = useState('');
  const [fBio, setFBio] = useState('');
  const [fAvatar, setFAvatar] = useState('');
  const [fRole, setFRole] = useState<Profile['role']>('customer');

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (q.trim()) query = query.or(`full_name.ilike.%${q.trim()}%,email.ilike.%${q.trim()}%`);
    if (roleFilter) query = query.eq('role', roleFilter);
    const { data } = await query;
    setUsers((data as Profile[]) || []);
    setLoading(false);
  }, [q, roleFilter]);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(load, 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [load]);

  const openEdit = (u: Profile) => {
    setEditing(u);
    setFName(u.full_name || '');
    setFPhone(u.phone || '');
    setFWa(u.whatsapp || '');
    setFBio(u.bio || '');
    setFAvatar(u.avatar_url || '');
    setFRole(u.role || 'customer');
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
    setEditing(null);
    load();
    onChanged?.();
  };

  const deleteUser = async (u: Profile) => {
    const { error } = await supabase.from('profiles').delete().eq('id', u.id);
    if (error) { window.alert('ডিলিট ব্যর্থ: ' + error.message); return; }
    load();
    onChanged?.();
  };

  return (
    <div>
      <SectionHead
        title="ইউজার ম্যানেজমেন্ট"
        sub="সব ইউজার — সম্পূর্ণ এডিট, রোল পরিবর্তন ও ডিলিট ক্ষমতা"
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="নাম বা ইমেইল খুঁজুন…"
          className="glass-input !w-64"
        />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="glass-select !w-44">
          <option value="">সব রোল</option>
          <option value="customer">ইউজার</option>
          <option value="photographer">ফটোগ্রাফার</option>
          <option value="admin">অ্যাডমিন</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-xl2" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <EmptyState icon="👥" title="কোনো ইউজার পাওয়া যায়নি" />
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="glass rounded-xl2 p-3.5 flex items-center gap-3">
              {u.avatar_url ? (
                <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-sunset-gold/30 shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-sunset-gradient flex items-center justify-center text-xs font-extrabold text-[#1A0E06] shrink-0">
                  {(u.full_name || 'ই').slice(0, 1)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white text-sm truncate">{u.full_name || '(নাম নেই)'}</span>
                  <StatusPill status={u.role} />
                </div>
                <span className="text-xs text-white/50 truncate block">
                  {u.email || u.id} · যোগদান {bnDate(u.created_at)}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button type="button" onClick={() => openEdit(u)} className="text-xs font-semibold text-sunset-gold hover:underline">
                  ✏️ এডিট
                </button>
                {u.role !== 'admin' && <DangerConfirm onConfirm={() => deleteUser(u)} message={`${u.full_name || 'এই ইউজার'}-কে ডিলিট করবেন?`} />}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      <AdminModal open={!!editing} onClose={() => setEditing(null)} title="ইউজার এডিট">
        <div className="space-y-4">
          <Field label="পুরো নাম">
            <input value={fName} onChange={(e) => setFName(e.target.value)} className="glass-input" />
          </Field>
          <Field label="ইমেইল (শুধু দেখার জন্য)">
            <input value={editing?.email || ''} disabled className="glass-input opacity-60" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ফোন">
              <input value={fPhone} onChange={(e) => setFPhone(e.target.value)} className="glass-input" placeholder="01XXXXXXXXX" />
            </Field>
            <Field label="WhatsApp">
              <input value={fWa} onChange={(e) => setFWa(e.target.value)} className="glass-input" placeholder="01XXXXXXXXX" />
            </Field>
          </div>
          <Field label="বায়ো">
            <textarea value={fBio} onChange={(e) => setFBio(e.target.value)} rows={3} className="glass-input resize-y" />
          </Field>
          <Field label="অ্যাভাটার URL">
            <input value={fAvatar} onChange={(e) => setFAvatar(e.target.value)} className="glass-input" placeholder="https://…" />
          </Field>
          <Field label="রোল" hint="রোল বদলালে ইউজারের অ্যাক্সেস সাথে সাথে বদলাবে">
            <select value={fRole} onChange={(e) => setFRole(e.target.value as Profile['role'])} className="glass-select">
              <option value="customer">ইউজার</option>
              <option value="photographer">ফটোগ্রাফার</option>
              <option value="admin">অ্যাডমিন</option>
            </select>
          </Field>

          {err && <p className="text-xs text-rose-400">{err}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={saveEdit} disabled={saving} className="btn-primary flex-1">
              {saving ? 'সেভ হচ্ছে…' : 'সেভ করুন'}
            </button>
            <button type="button" onClick={() => setEditing(null)} className="btn-ghost">
              বাতিল
            </button>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}
