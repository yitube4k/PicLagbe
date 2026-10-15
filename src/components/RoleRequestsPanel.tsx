import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toBn, bnDate } from '../lib/utils';

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
 * অ্যাডমিন — ফটোগ্রাফার মাইগ্রেশন আবেদন (role_requests) রিভিউ।
 * Approve → approve_role_request RPC (photographers রো + profiles.role আপডেট + নোটিফিকেশন)
 * Reject  → reject_role_request RPC (রিভিউ নোট সহ)
 */
export default function RoleRequestsPanel() {
  const [reqs, setReqs] = useState<RoleReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('role_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error) setReqs((data as RoleReq[]) || []);
    else console.error('Role requests load error:', error);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const pending = reqs.filter((r) => r.status === 'pending');
  const history = reqs.filter((r) => r.status !== 'pending');

  const handleApprove = async (r: RoleReq) => {
    if (!confirm(`"${r.display_name}"-এর আবেদন অনুমোদন করবেন? ফটোগ্রাফার প্রোফাইল অটো-তৈরি হবে।`)) return;
    setBusyId(r.id);
    setMsg(null);
    const { error } = await supabase.rpc('approve_role_request', { req_id: r.id });
    setBusyId(null);
    if (error) {
      setMsg({ ok: false, text: 'অনুমোদন ব্যর্থ: ' + error.message });
      console.error('approve_role_request error:', error);
    } else {
      setMsg({ ok: true, text: `✅ "${r.display_name}" এখন ফটোগ্রাফার — প্রোফাইল তৈরি হয়েছে।` });
      load();
    }
  };

  const handleReject = async (r: RoleReq) => {
    setBusyId(r.id);
    setMsg(null);
    const { error } = await supabase.rpc('reject_role_request', { req_id: r.id, note: rejectNote.trim() || 'রিভিউয়ে গ্রহণযোগ্য নয়' });
    setBusyId(null);
    setRejectingId(null);
    setRejectNote('');
    if (error) {
      setMsg({ ok: false, text: 'প্রত্যাখ্যান ব্যর্থ: ' + error.message });
      console.error('reject_role_request error:', error);
    } else {
      setMsg({ ok: true, text: 'আবেদন প্রত্যাখ্যাত হয়েছে।' });
      load();
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="font-bold text-white text-lg">
        🎬 ফটোগ্রাফার মাইগ্রেশন আবেদন{' '}
        {pending.length > 0 && (
          <span className="ml-1 text-xs font-bold bg-sunset-gradient text-[#1A0E06] rounded-full px-2.5 py-1">
            {toBn(pending.length)} টি অপেক্ষমাণ
          </span>
        )}
      </h3>

      {msg && (
        <p className={`text-xs ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p>
      )}

      {loading ? (
        <div className="skeleton h-40 rounded-xl3" />
      ) : pending.length === 0 ? (
        <div className="glass-card p-10 text-center rounded-xl3">
          <p className="text-white/60 text-sm">কোনো অপেক্ষমাণ আবেদন নেই।</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((r) => (
            <div key={r.id} className="glass-card p-5 rounded-xl3 space-y-3 border-sunset-gold/40">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="font-bold text-white text-base">👤 {r.display_name}</h4>
                  <p className="text-[11px] text-white/45 mt-0.5">আবেদন: {bnDate(r.created_at)}</p>
                </div>
                <span className="text-[10px] font-bold border border-sunset-gold/40 text-sunset-gold rounded-full px-2.5 py-1">
                  অপেক্ষমাণ
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-2 text-[13px]">
                <Info label="📞 ফোন" value={r.phone} />
                <Info label="💬 WhatsApp" value={r.whatsapp} />
                <Info label="📍 এলাকা" value={r.city} />
                <Info label="🎯 অভিজ্ঞতা" value={r.experience_years ? `${toBn(r.experience_years)} বছর` : null} />
                <Info label="📷 যন্ত্রপাতি" value={r.equipment} />
                <Info
                  label="🔗 পোর্টফোলিও"
                  value={r.portfolio_url}
                  link={r.portfolio_url || undefined}
                />
              </div>

              {r.note && (
                <p className="text-[13px] text-white/70 bg-white/[0.03] p-3 rounded-xl2 leading-relaxed">
                  📝 {r.note}
                </p>
              )}

              {rejectingId === r.id ? (
                <div className="glass rounded-xl2 p-4 space-y-3">
                  <label className="field-label" htmlFor={`rn-${r.id}`}>প্রত্যাখ্যানের কারণ (ইউজার দেখতে পাবে)</label>
                  <input
                    id={`rn-${r.id}`}
                    className="glass-input"
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    placeholder="যেমন: পোর্টফোলিও যাচাই করা যায়নি — আরও ৩টি কাজের নমুনা দিন"
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setRejectingId(null); setRejectNote(''); }} className="btn-ghost !py-1.5 !px-3 !text-xs">
                      বাতিল
                    </button>
                    <button type="button" onClick={() => handleReject(r)} disabled={busyId === r.id} className="btn-danger !py-1.5 !px-4 !text-xs">
                      {busyId === r.id ? 'হচ্ছে…' : 'প্রত্যাখ্যান নিশ্চিত'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-white/[0.07]">
                  <button type="button" onClick={() => setRejectingId(r.id)} disabled={busyId === r.id} className="btn-danger !py-1.5 !px-4 !text-xs">
                    প্রত্যাখ্যান
                  </button>
                  <button type="button" onClick={() => handleApprove(r)} disabled={busyId === r.id} className="btn-primary !py-1.5 !px-4 !text-xs">
                    {busyId === r.id ? 'প্রক্রিয়াধীন…' : '✅ অনুমোদন করুন'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="glass-card rounded-xl3 p-5">
          <h4 className="font-bold text-white text-sm mb-3">🗂️ আগের সিদ্ধান্ত</h4>
          <div className="space-y-2">
            {history.map((r) => (
              <div key={r.id} className="glass rounded-xl2 p-3 flex flex-wrap items-center justify-between gap-2 text-[13px]">
                <span className="font-semibold text-white">{r.display_name}</span>
                <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${r.status === 'approved' ? 'border-emerald-400/40 text-emerald-400' : 'border-red-400/40 text-red-400'}`}>
                  {r.status === 'approved' ? 'অনুমোদিত' : 'প্রত্যাখ্যাত'}
                </span>
                {r.review_note && <span className="text-[11px] text-white/50 basis-full">💬 {r.review_note}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value, link }: { label: string; value: string | null; link?: string }) {
  if (!value) return <span className="text-white/35 text-[12px]">{label}: —</span>;
  return (
    <span className="text-white/75 truncate">
      {label}:{' '}
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className="text-sunset-gold hover:underline break-all">
          {value}
        </a>
      ) : (
        <b className="text-white font-semibold">{value}</b>
      )}
    </span>
  );
}
