import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { toBn, bnDateTime } from '../../lib/utils';
import { ACTION_BN, ENTITY_BN } from '../../lib/audit';
import { EmptyState, SectionHead, DangerConfirm } from './kit';

/* ═══════════════ অডিট রিপোর্ট — লগ দেখা + রিপোর্ট সেভ/ডাউনলোড/ডিলিট ═══════════════ */

type AuditLog = {
  id: string;
  actor_email: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  title: string | null;
  details: { note?: string; before?: Record<string, unknown>; after?: Record<string, unknown>; meta?: Record<string, unknown> } | null;
  created_at: string;
};

type SavedReport = {
  id: string;
  actor_email: string | null;
  title: string;
  period_from: string | null;
  period_to: string | null;
  filters: Record<string, unknown>;
  entries: unknown[];
  entry_count: number;
  created_at: string;
};

const ACTION_EMOJI: Record<string, string> = {
  create: '➕', update: '✏️', delete: '🗑', approve: '✅', reject: '❌',
  verify: '🛡️', unverify: '⚠️', publish: '📢', unpublish: '🚫',
  role_change: '🔄', status_change: '🔁', report_saved: '🧾',
};

export default function AdminAudit() {
  const [tab, setTab] = useState<'logs' | 'reports'>('logs');

  // ── logs state ──
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tblMissing, setTblMissing] = useState(false);
  const [q, setQ] = useState('');
  const [entityF, setEntityF] = useState('');
  const [actionF, setActionF] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── reports state ──
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  // ── save modal state ──
  const [saveOpen, setSaveOpen] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300);
    if (entityF) query = query.eq('entity', entityF);
    if (actionF) query = query.eq('action', actionF);
    if (dateFrom) query = query.gte('created_at', new Date(dateFrom + 'T00:00:00').toISOString());
    if (dateTo) query = query.lte('created_at', new Date(dateTo + 'T23:59:59').toISOString());
    if (q.trim()) {
      query = query.or(`title.ilike.%${q.trim()}%,actor_email.ilike.%${q.trim()}%,details->>note.ilike.%${q.trim()}%`);
    }
    const { data, error } = await query;
    // টেবিল না থাকলে (42P01/404) SQL গাইড দেখাও
    const missing = !!error && (error.code === '42P01' || error.code === 'PGRST205' || (error.message || '').includes('does not exist') || (error.message || '').includes('Could not find the table'));
    setTblMissing(missing);
    setLogs((data as AuditLog[]) || []);
    setLoading(false);
  }, [q, entityF, actionF, dateFrom, dateTo]);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(loadLogs, 250);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [loadLogs]);

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    const { data } = await supabase
      .from('audit_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setReports((data as SavedReport[]) || []);
    setLoadingReports(false);
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  /** বর্তমান ফিল্টার অনুযায়ী রিপোর্ট সেভ করুন (স্ন্যাপশট স্থায়ী থাকে) */
  const saveReport = async () => {
    if (!reportTitle.trim()) { setSaveErr('রিপোর্টের নাম দিন'); return; }
    setSaving(true);
    setSaveErr(null);

    const { data: userData } = await supabase.auth.getUser();
    const payload = {
      actor_id: userData?.user?.id || null,
      actor_email: userData?.user?.email || null,
      title: reportTitle.trim(),
      period_from: dateFrom ? new Date(dateFrom + 'T00:00:00').toISOString() : null,
      period_to: dateTo ? new Date(dateTo + 'T23:59:59').toISOString() : null,
      filters: { q: q.trim(), entity: entityF, action: actionF, dateFrom, dateTo },
      entries: logs as unknown as unknown[],
      entry_count: logs.length,
    };

    const { error } = await supabase.from('audit_reports').insert(payload);
    setSaving(false);
    if (error) { setSaveErr('সেভ ব্যর্থ: ' + error.message); return; }

    // রিপোর্ট সেভ নিজেও অডিটে থাকবে
    const { logAction } = await import('../../lib/audit');
    logAction('report_saved', 'system', null, reportTitle.trim(), {
      note: `অডিট রিপোর্ট সেভ: "${reportTitle.trim()}" (${toBn(logs.length)} টি এন্ট্রি)`,
    });

    setSaveOpen(false);
    setReportTitle('');
    loadReports();
    setTab('reports');
  };

  /** রিপোর্ট ডাউনলোড (JSON ফাইল) */
  const downloadReport = (r: SavedReport) => {
    const blob = new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `piclagbe-audit-${r.title.replace(/[^\u0980-\u09FFa-zA-Z0-9]+/g, '-').slice(0, 40)}-${r.created_at.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const delReport = async (r: SavedReport) => {
    const { error } = await supabase.from('audit_reports').delete().eq('id', r.id);
    if (error) { window.alert('ডিলিট ব্যর্থ: ' + error.message); return; }
    loadReports();
  };

  const entityLabel = (e: string) => ENTITY_BN[e] || e;
  const actionLabel = (a: string) => ACTION_BN[a] || a;

  return (
    <div>
      <SectionHead
        title="অডিট রিপোর্ট"
        sub="অ্যাডমিন প্যানেলের প্রতিটি কাজের স্বয়ংক্রিয় রেকর্ড — ফিল্টার করে রিপোর্ট সেভ ও ডাউনলোড করুন"
      />

      {/* Tab switch */}
      <div className="flex gap-2 mb-5">
        <button
          type="button"
          onClick={() => setTab('logs')}
          className={`rounded-full px-4 py-2 text-sm font-semibold border transition ${
            tab === 'logs'
              ? 'bg-sunset-soft border-sunset-gold/40 text-sunset-gold font-bold'
              : 'border-white/10 bg-white/[0.04] text-white/70'
          }`}
        >
          📜 লগ দেখুন {logs.length > 0 && <span className="text-[11.5px] text-white/50">({toBn(logs.length)})</span>}
        </button>
        <button
          type="button"
          onClick={() => setTab('reports')}
          className={`rounded-full px-4 py-2 text-sm font-semibold border transition ${
            tab === 'reports'
              ? 'bg-sunset-soft border-sunset-gold/40 text-sunset-gold font-bold'
              : 'border-white/10 bg-white/[0.04] text-white/70'
          }`}
        >
          🧾 সেভ করা রিপোর্ট {reports.length > 0 && <span className="text-[11.5px] text-white/50">({toBn(reports.length)})</span>}
        </button>
      </div>

      {tab === 'logs' && tblMissing && (
        <div className="glass rounded-xl2 p-4 mb-5 border border-amber-400/30 bg-amber-400/[0.07]">
          <p className="text-sm font-bold text-amber-300 mb-1">⚠️ ডাটাবেসে অডিট টেবিল এখনো তৈরি হয়নি</p>
          <p className="text-xs text-white/65 leading-relaxed">
            Supabase Dashboard → SQL Editor-এ প্রজেক্টের <code className="text-emerald-300">supabase_schema_v16_audit.sql</code> ফাইলটি রান করুন —
            তারপর থেকে সব অ্যাডমিন কাজ (অনুমোদন, এডিট, ডিলিট) স্বয়ংক্রিয়ভাবে এখানে জমা হবে।
          </p>
        </div>
      )}

      {/* ════════ LOGS TAB ════════ */}
      {tab === 'logs' && (
        <>
          {/* Filters */}
          <div className="glass rounded-xl2 p-4 mb-5 space-y-3">
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="নাম / ইমেইল / বর্ণনা খুঁজুন…"
                className="glass-input !w-64 flex-1"
              />
              <select value={entityF} onChange={(e) => setEntityF(e.target.value)} className="glass-select !w-40">
                <option value="">সব ধরন</option>
                {Object.entries(ENTITY_BN).filter(([k]) => k !== 'system').map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <select value={actionF} onChange={(e) => setActionF(e.target.value)} className="glass-select !w-40">
                <option value="">সব কাজ</option>
                {Object.entries(ACTION_BN).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <label className="field-label !text-[11.5px]">শুরুর তারিখ</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="glass-input !py-1.5 !text-xs" />
              </div>
              <div>
                <label className="field-label !text-[11.5px]">শেষ তারিখ</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="glass-input !py-1.5 !text-xs" />
              </div>
              {(q || entityF || actionF || dateFrom || dateTo) && (
                <button
                  type="button"
                  onClick={() => { setQ(''); setEntityF(''); setActionF(''); setDateFrom(''); setDateTo(''); }}
                  className="chip !py-1.5 text-xs"
                >
                  ↺ ফিল্টার মুছুন
                </button>
              )}
            </div>
          </div>

          {/* Save report CTA */}
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <p className="text-xs text-white/50">
              {loading ? 'লোড হচ্ছে…' : `${toBn(logs.length)} টি এন্ট্রি (সর্বশেষ ৩০০টি পর্যন্ত)`}
            </p>
            <button
              type="button"
              onClick={() => { setSaveOpen(true); setSaveErr(null); }}
              disabled={logs.length === 0}
              className="btn-primary !py-2 !text-xs disabled:opacity-40"
            >
              🧾 এই ফিল্টারে রিপোর্ট সেভ করুন
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-16 rounded-xl2" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <EmptyState
              icon="📜"
              title="কোনো অডিট এন্ট্রি নেই"
              sub="অ্যাডমিন প্যানেলে কাজ করলেই (অনুমোদন, এডিট, ডিলিট) এখানে রেকর্ড জমা হবে।"
            />
          ) : (
            <div className="space-y-2">
              {logs.map((l) => (
                <div key={l.id} className="glass rounded-xl2 p-3.5 flex items-start gap-3">
                  <span className="w-9 h-9 rounded-xl2 glass grid place-items-center text-base shrink-0" aria-hidden="true">
                    {ACTION_EMOJI[l.action] || '•'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-sm">{l.title || '—'}</span>
                      <span className="rounded-full border border-sunset-gold/30 bg-sunset-soft text-sunset-gold text-[11.5px] font-bold px-2 py-0.5">
                        {actionLabel(l.action)}
                      </span>
                      <span className="text-[11.5px] font-semibold text-white/45 border border-white/10 rounded-full px-2 py-0.5">
                        {entityLabel(l.entity)}
                      </span>
                    </div>
                    <p className="text-xs text-white/60 mt-1 leading-relaxed">
                      {l.details?.note || '—'}
                    </p>
                    <p className="text-[11.5px] text-white/35 mt-1">
                      {bnDateTime(l.created_at)} · {l.actor_email || 'অজানা'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ════════ REPORTS TAB ════════ */}
      {tab === 'reports' && (
        <>
          {loadingReports ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-16 rounded-xl2" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <EmptyState
              icon="🧾"
              title="কোনো সেভ করা রিপোর্ট নেই"
              sub={'লগ ট্যাব থেকে ফিল্টার করে "রিপোর্ট সেভ করুন" চাপলে এখানে জমা থাকবে।'}
            />
          ) : (
            <div className="space-y-2">
              {reports.map((r) => {
                const per = [
                  r.period_from ? bnDateTime(r.period_from) : null,
                  r.period_to ? bnDateTime(r.period_to) : null,
                ].filter(Boolean).join(' → ');
                return (
                  <div key={r.id} className="glass-card rounded-xl2 p-4 flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl2 glass grid place-items-center text-lg shrink-0" aria-hidden="true">🧾</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white text-sm truncate">{r.title}</p>
                      <p className="text-[12.5px] text-white/50 mt-0.5">
                        {toBn(r.entry_count)} টি এন্ট্রি · সেভ {bnDateTime(r.created_at)}
                        {per && <span className="hidden sm:inline"> · সময়সীমা: {per}</span>}
                      </p>
                      <p className="text-[11.5px] text-white/35 mt-0.5">সেভ করেছেন: {r.actor_email || '—'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => downloadReport(r)}
                        className="chip !py-1.5 text-xs"
                        title="JSON ফাইল হিসেবে ডাউনলোড"
                      >
                        ⬇ ডাউনলোড
                      </button>
                      <DangerConfirm onConfirm={() => delReport(r)} message={`"${r.title}" রিপোর্ট মুছে ফেলবেন?`} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Save modal */}
      {saveOpen && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-label="রিপোর্ট সেভ">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSaveOpen(false)} />
          <div className="relative glass-strong rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-glass-lg">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-b border-white/[0.08] bg-twilight-900/95 backdrop-blur rounded-t-2xl">
              <h3 className="font-bold text-white">🧾 রিপোর্ট সেভ করুন</h3>
              <button type="button" onClick={() => setSaveOpen(false)} aria-label="বন্ধ" className="w-8 h-8 rounded-full glass flex items-center justify-center text-white/70 hover:text-white">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-white/60 leading-relaxed">
                বর্তমান ফিল্টারের <b className="text-white">{toBn(logs.length)}</b> টি এন্ট্রির স্থায়ী স্ন্যাপশট সেভ হবে — পরে লগ বদলালেও রিপোর্ট অপরিবর্তিত থাকবে।
              </p>
              <div>
                <label className="field-label">রিপোর্টের নাম</label>
                <input
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="যেমন: মাসিক অনুমোদন রিপোর্ট — অক্টোবর"
                  className="glass-input"
                  autoFocus
                />
              </div>
              <div className="bg-black/30 border border-white/[0.08] rounded-xl2 p-3 text-[12.5px] text-white/55 space-y-1">
                <p>• ধরন: {entityF ? entityLabel(entityF) : 'সব'}</p>
                <p>• কাজ: {actionF ? actionLabel(actionF) : 'সব'}</p>
                <p>• সময়: {dateFrom || 'শুরু নেই'} → {dateTo || 'আজ পর্যন্ত'}</p>
              </div>
              {saveErr && <p className="text-xs text-rose-400">{saveErr}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={saveReport} disabled={saving} className="btn-primary flex-1">
                  {saving ? 'সেভ হচ্ছে…' : 'সেভ করুন'}
                </button>
                <button type="button" onClick={() => setSaveOpen(false)} className="btn-ghost">বাতিল</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
