import React, { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toBn, bnDate } from '../lib/utils';
import { logAction } from '../lib/audit';
import {
  AdminSheet, FullDialog, ConfirmDialog, FilterBar, OverflowMenu,
  StatusPill, EmptyState, ListSkeleton, KV, waMe, telHref,
  useAdminList, useSnack,
} from './admin/kit';
import { AIcon } from '../admin/icons';

type RoleReq = {
  id: string;
  user_id: string;
  display_name: string;
  phone: string | null;
  whatsapp: string | null;
  city: string | null;
  experience_years: number | null;
  equipment: string | null;
  portfolio_url: string | null;
  note: string | null;
  status: 'pending' | 'approved' | 'rejected';
  review_note: string | null;
  created_at: string;
};

/**
 * অ্যাডমিন — ফটোগ্রাফার মাইগ্রেশন আবেদন (role_requests) — Android style:
 * card tap = view sheet, pending → inline অ্যাপ্রুভ; reject = full dialog w/ note;
 * approve = M3 confirm. Approve → approve_role_request RPC.
 */
export default function RoleRequestsPanel() {
  const [tab, setTab] = useState<'pending' | 'history'>('pending');

  const fetcher = useCallback(async () => {
    const { data, error } = await supabase
      .from('role_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) console.error('Role requests load error:', error);
    return (data as RoleReq[]) || [];
  }, []);

  const list = useAdminList<RoleReq>(fetcher, []);
  const { show } = useSnack();

  const [viewing, setViewing] = useState<RoleReq | null>(null);
  const [approving, setApproving] = useState<RoleReq | null>(null);
  const [rejecting, setRejecting] = useState<RoleReq | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [busy, setBusy] = useState(false);

  const items = tab === 'pending' ? list.items.filter((r) => r.status === 'pending') : list.items.filter((r) => r.status !== 'pending');
  const pendingCount = list.items.filter((r) => r.status === 'pending').length;

  const handleApprove = async () => {
    if (!approving) return;
    const r = approving;
    setBusy(true);
    const { error } = await supabase.rpc('approve_role_request', { req_id: r.id });
    setBusy(false);
    if (error) {
      show('অনুমোদন ব্যর্থ: ' + error.message, { tone: 'error' });
      console.error('approve_role_request error:', error);
      return;
    }
    logAction('approve', 'role_request', r.id, r.display_name, {
      note: `ফটোগ্রাফার মাইগ্রেশন অনুমোদন: ${r.display_name} — প্রোফাইল অটো-তৈরি হয়েছে`,
      meta: { phone: r.phone, experience_years: r.experience_years },
    });
    list.patch(r.id, { status: 'approved' } as Partial<RoleReq>);
    show(`${r.display_name} এখন ফটোগ্রাফার — প্রোফাইল তৈরি হয়েছে ✓`);
    setApproving(null);
    setViewing((v) => (v && v.id === r.id ? { ...v, status: 'approved' } : v));
  };

  const handleReject = async () => {
    if (!rejecting) return;
    const r = rejecting;
    setBusy(true);
    const { error } = await supabase.rpc('reject_role_request', { req_id: r.id, note: rejectNote.trim() || 'রিভিউয়ে গ্রহণযোগ্য নয়' });
    setBusy(false);
    if (error) {
      show('প্রত্যাখ্যান ব্যর্থ: ' + error.message, { tone: 'error' });
      console.error('reject_role_request error:', error);
      return;
    }
    logAction('reject', 'role_request', r.id, r.display_name, {
      note: `মাইগ্রেশন আবেদন প্রত্যাখ্যান: ${r.display_name}`,
      meta: { review_note: rejectNote.trim() || 'রিভিউয়ে গ্রহণযোগ্য নয়' },
    });
    list.patch(r.id, { status: 'rejected', review_note: rejectNote.trim() || 'রিভিউয়ে গ্রহণযোগ্য নয়' } as Partial<RoleReq>);
    show('আবেদন প্রত্যাখ্যাত হয়েছে');
    setRejecting(null);
    setViewing((v) => (v && v.id === r.id ? { ...v, status: 'rejected' } : v));
  };

  return (
    <div>
      <FilterBar
        chips={[
          { key: 'pending', label: 'অপেক্ষমাণ', count: pendingCount },
          { key: 'history', label: 'আগের সিদ্ধান্ত' },
        ]}
        activeChip={tab}
        onChip={(k) => setTab(k as typeof tab)}
      />

      {list.error && <p className="text-sm text-rose-300 mb-3">{list.error}</p>}

      {list.loading ? (
        <ListSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          icon={tab === 'pending' ? '🎬' : '🗂️'}
          title={tab === 'pending' ? 'কোনো অপেক্ষমাণ আবেদন নেই' : 'কোনো সিদ্ধান্ত নেই'}
          sub={tab === 'pending' ? 'নতুন ফটোগ্রাফার আবেদন এলে এখানে দেখা যাবে।' : undefined}
        />
      ) : (
        <div className="space-y-2.5">
          {items.map((r) => (
            <div key={r.id} className={`glass rounded-xl2 p-3.5 flex items-center gap-2.5 ${r.status === 'pending' ? 'border-sunset-gold/30' : ''}`}>
              <button type="button" onClick={() => setViewing(r)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                <span className="w-11 h-11 rounded-full bg-sunset-gradient grid place-items-center text-sm font-extrabold text-[#1A0E06] shrink-0">
                  {r.display_name.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-white text-[14.5px] truncate">{r.display_name}</span>
                    <StatusPill status={r.status} />
                  </div>
                  <span className="text-[12.5px] text-white/50 truncate block mt-0.5">
                    {r.city || '—'} · {r.experience_years ? `${toBn(r.experience_years)} বছর` : 'অভিজ্ঞতা নেই'} · {bnDate(r.created_at)}
                  </span>
                </div>
              </button>
              {r.status === 'pending' && (
                <button type="button" onClick={() => setApproving(r)} disabled={busy}
                  title="অনুমোদন করুন" aria-label="অনুমোদন করুন"
                  className="shrink-0 w-11 h-11 rounded-full grid place-items-center bg-emerald-400/15 border border-emerald-400/30 text-emerald-300 active:scale-90 transition-transform disabled:opacity-50">
                  <AIcon name="check" size={19} strokeWidth={2.4} />
                </button>
              )}
              <OverflowMenu
                items={[
                  { icon: 'eye', label: 'বিস্তারিত দেখুন', onClick: () => setViewing(r) },
                  { icon: 'check', label: 'অনুমোদন করুন', hide: r.status !== 'pending', onClick: () => setApproving(r) },
                  { icon: 'xmark', label: 'প্রত্যাখ্যান করুন', hide: r.status !== 'pending', danger: true, onClick: () => { setRejecting(r); setRejectNote(''); } },
                ]}
              />
            </div>
          ))}
        </div>
      )}

      {/* VIEW SHEET */}
      <AdminSheet
        open={!!viewing}
        onClose={() => setViewing(null)}
        header={
          viewing ? (
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span className="w-11 h-11 rounded-full bg-sunset-gradient grid place-items-center text-sm font-extrabold text-[#1A0E06] shrink-0">
                {viewing.display_name.slice(0, 1)}
              </span>
              <div className="min-w-0">
                <h3 className="font-extrabold text-white text-[16px] leading-snug truncate">{viewing.display_name}</h3>
                <div className="mt-0.5"><StatusPill status={viewing.status} /></div>
              </div>
            </div>
          ) : undefined
        }
        footer={
          viewing && viewing.status === 'pending' ? (
            <>
              <button type="button" onClick={() => setApproving(viewing)} className="btn-primary flex-1 justify-center">
                <AIcon name="check" size={16} strokeWidth={2.4} className="mr-1.5" /> অনুমোদন করুন
              </button>
              <button type="button" onClick={() => { setRejecting(viewing); setRejectNote(''); }} className="btn-ghost !px-4 !text-rose-300">
                প্রত্যাখ্যান
              </button>
            </>
          ) : undefined
        }
      >
        {viewing && (
          <div>
            <KV k="ফোন" v={viewing.phone || '—'} />
            <KV k="WhatsApp" v={viewing.whatsapp || '—'} />
            <KV k="এলাকা" v={viewing.city || '—'} />
            <KV k="অভিজ্ঞতা" v={viewing.experience_years ? `${toBn(viewing.experience_years)} বছর` : '—'} />
            <KV k="যন্ত্রপাতি" v={viewing.equipment || '—'} />
            <KV
              k="পোর্টফোলিও"
              v={viewing.portfolio_url ? (
                <a href={viewing.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-sunset-gold hover:underline break-all">
                  {viewing.portfolio_url}
                </a>
              ) : '—'}
            />
            <KV k="আবেদনের তারিখ" v={bnDate(viewing.created_at)} />
            {viewing.review_note && <KV k="রিভিউ নোট" v={viewing.review_note} />}
            {viewing.note && (
              <div className="mt-3">
                <p className="field-label">আবেদনের নোট</p>
                <p className="text-[13.5px] text-white/80 leading-relaxed mt-1 whitespace-pre-line">{viewing.note}</p>
              </div>
            )}
          </div>
        )}
      </AdminSheet>

      {/* APPROVE M3 CONFIRM */}
      <ConfirmDialog
        open={!!approving}
        onClose={() => setApproving(null)}
        onConfirm={handleApprove}
        busy={busy}
        tone="primary"
        icon="check"
        title={`"${approving?.display_name || ''}"-কে ফটোগ্রাফার করবেন?`}
        body="অনুমোদন করলে ফটোগ্রাফার প্রোফাইল অটো-তৈরি হবে এবং ইউজার নোটিফিকেশন পাবে।"
        confirmLabel="অনুমোদন করুন"
        cancelLabel="বাতিল"
      />

      {/* REJECT FULL DIALOG */}
      <FullDialog
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title="আবেদন প্রত্যাখ্যান"
        sub={rejecting?.display_name}
        onSave={handleReject}
        saving={busy}
        saveLabel="প্রত্যাখ্যান নিশ্চিত করুন"
        dirty
      >
        <div className="space-y-4">
          <p className="text-[13.5px] text-white/60 leading-relaxed">
            প্রত্যাখ্যানের কারণ ইউজার দেখতে পাবে — পরিষ্কারভাবে লিখুন যেন পরে আবার আবেদন করতে পারে।
          </p>
          <div className="[&_label]:!text-base">
            <label className="field-label">প্রত্যাখ্যানের কারণ (ইউজার দেখতে পাবে)</label>
            <textarea
              className="glass-input resize-y !text-base mt-1"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={4}
              placeholder="যেমন: পোর্টফোলিও যাচাই করা যায়নি — আরও ৩টি কাজের নমুনা দিন"
            />
          </div>
        </div>
      </FullDialog>
    </div>
  );
}
