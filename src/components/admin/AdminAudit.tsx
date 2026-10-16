import React, { useState, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { toBn, bnDateTime } from '../../lib/utils';
import { ACTION_BN, ENTITY_BN } from '../../lib/audit';
import {
  AdminSheet, ConfirmDialog, FilterBar, OverflowMenu, Field,
  EmptyState, ListSkeleton, KV, ProgressiveRows,
  useAdminList, useSnack,
} from './kit';
import { AIcon } from '../../admin/icons';

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
  const [tblMissing, setTblMissing] = useState(false);
  const [q, setQ] = useState('');
  const [entityF, setEntityF] = useState('');
  const [actionF, setActionF] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const debouncedQ = useRef('');
  const [qTick, setQTick] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logsFetcher = useCallback(async () => {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300);
    if (entityF) query = query.eq('entity', entityF);
    if (actionF) query = query.eq('action', actionF);
    if (dateFrom) query = query.gte('created_at', new Date(dateFrom + 'T00:00:00').toISOString());
    if (dateTo) query = query.lte('created_at', new Date(dateTo + 'T23:59:59').toISOString());
    if (debouncedQ.current.trim()) {
      const t = debouncedQ.current.trim();
      query = query.or(`title.ilike.%${t}%,actor_email.ilike.%${t}%,details->>note.ilike.%${t}%`);
    }
    const { data, error } = await query;
    const missing = !!error && (error.code === '42P01' || error.code === 'PGRST205' || (error.message || '').includes('does not exist') || (error.message || '').includes('Could not find the table'));
    setTblMissing(missing);
    return (data as AuditLog[]) || [];
  }, [entityF, actionF, dateFrom, dateTo]);

  const logs = useAdminList<AuditLog>(logsFetcher, [entityF, actionF, dateFrom, dateTo]);

  const onQ = useCallback((v: string) => {
    setQ(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debouncedQ.current = v;
      setQTick((n) => n + 1);
    }, 350);
  }, []);
  React.useEffect(() => { if (qTick) logs.silentReload(); }, [qTick]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── reports state ──
  const reportsFetcher = useCallback(async () => {
    const { data } = await supabase
      .from('audit_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    return (data as SavedReport[]) || [];
  }, []);
  const reports = useAdminList<SavedReport>(reportsFetcher, []);
  const { show } = useSnack();

  // ── save modal state ──
  const [saveOpen, setSaveOpen] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  // ── report detail / delete ──
  const [viewing, setViewing] = useState<SavedReport | null>(null);
  const [deleting, setDeleting] = useState<SavedReport | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);

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
      entries: logs.items as unknown as unknown[],
      entry_count: logs.items.length,
    };

    const { error } = await supabase.from('audit_reports').insert(payload);
    setSaving(false);
    if (error) { setSaveErr('সেভ ব্যর্থ: ' + error.message); return; }

    const { logAction } = await import('../../lib/audit');
    logAction('report_saved', 'system', null, reportTitle.trim(), {
      note: `অডিট রিপোর্ট সেভ: "${reportTitle.trim()}" (${toBn(logs.items.length)} টি এন্ট্রি)`,
    });

    setSaveOpen(false);
    setReportTitle('');
    show('রিপোর্ট সেভ হয়েছে 🧾');
    reports.silentReload();
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
    show('JSON ডাউনলোড শুরু হয়েছে');
  };

  const delReport = async () => {
    if (!deleting) return;
    setBusyDelete(true);
    const { error } = await supabase.from('audit_reports').delete().eq('id', deleting.id);
    setBusyDelete(false);
    if (error) { show('ডিলিট ব্যর্থ: ' + error.message, { tone: 'error' }); return; }
    reports.remove(deleting.id);
    show('রিপোর্ট মুছে ফেলা হয়েছে');
    setDeleting(null);
    setViewing((v) => (v && deleting && v.id === deleting.id ? null : v));
  };

  const entityLabel = (e: string) => ENTITY_BN[e] || e;
  const actionLabel = (a: string) => ACTION_BN[a] || a;
  const hasFilter = q || entityF || actionF || dateFrom || dateTo;

  return (
    <div>
      {/* tab chips */}
      <FilterBar
        chips={[
          { key: 'logs', label: '📜 লগ দেখুন', count: logs.items.length || undefined },
          { key: 'reports', label: '🧾 সেভ করা রিপোর্ট', count: reports.items.length || undefined },
        ]}
        activeChip={tab}
        onChip={(k) => setTab(k as typeof tab)}
        right={
          tab === 'logs' ? (
            <button
              type="button"
              onClick={() => { setSaveOpen(true); setSaveErr(null); }}
              disabled={logs.items.length === 0}
              title="এই ফিল্টারে রিপোর্ট সেভ করুন"
              aria-label="রিপোর্ট সেভ করুন"
              className="shrink-0 w-11 h-11 rounded-full grid place-items-center bg-sunset-gradient text-[#1A0E06] shadow-sunset-glow active:scale-90 transition-transform disabled:opacity-40"
            >
              <AIcon name="download" size={19} strokeWidth={2.2} />
            </button>
          ) : undefined
        }
      >
        {tab === 'logs' && (
          <div className="flex flex-wrap gap-2 items-center">
            <select value={entityF} onChange={(e) => setEntityF(e.target.value)} className="glass-select !w-auto !min-h-[38px] !py-1 !text-[12.5px]">
              <option value="">সব ধরন</option>
              {Object.entries(ENTITY_BN).filter(([k]) => k !== 'system').map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select value={actionF} onChange={(e) => setActionF(e.target.value)} className="glass-select !w-auto !min-h-[38px] !py-1 !text-[12.5px]">
              <option value="">সব কাজ</option>
              {Object.entries(ACTION_BN).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="glass-input !py-1 !min-h-[38px] !text-[12.5px] !w-auto" aria-label="শুরুর তারিখ" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="glass-input !py-1 !min-h-[38px] !text-[12.5px] !w-auto" aria-label="শেষ তারিখ" />
            {hasFilter && (
              <button type="button" onClick={() => { setQ(''); setEntityF(''); setActionF(''); setDateFrom(''); setDateTo(''); debouncedQ.current = ''; }}
                className="chip !py-1 !text-[12px]">
                ↺ ফিল্টার মুছুন
              </button>
            )}
          </div>
        )}
      </FilterBar>

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
          {logs.loading ? (
            <ListSkeleton rows={6} />
          ) : logs.items.length === 0 ? (
            <EmptyState
              icon="📜"
              title="কোনো অডিট এন্ট্রি নেই"
              sub="অ্যাডমিন প্যানেলে কাজ করলেই (অনুমোদন, এডিট, ডিলিট) এখানে রেকর্ড জমা হবে।"
            />
          ) : (
            <ProgressiveRows
              items={logs.items}
              resetKey={`${entityF}|${actionF}|${dateFrom}|${dateTo}|${qTick}`}
              className="space-y-2"
              renderRow={(l) => (
                <div key={l.id} className="glass rounded-xl2 p-3.5 flex items-start gap-3">
                  <span className="w-10 h-10 rounded-xl2 glass grid place-items-center text-base shrink-0" aria-hidden="true">
                    {ACTION_EMOJI[l.action] || '•'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-[13.5px]">{l.title || '—'}</span>
                      <span className="rounded-full border border-sunset-gold/30 bg-sunset-soft text-sunset-gold text-[11px] font-bold px-2 py-0.5 whitespace-nowrap">
                        {actionLabel(l.action)}
                      </span>
                      <span className="text-[11px] font-semibold text-white/45 border border-white/10 rounded-full px-2 py-0.5 whitespace-nowrap">
                        {entityLabel(l.entity)}
                      </span>
                    </div>
                    {l.details?.note && <p className="text-[12.5px] text-white/60 mt-1 leading-relaxed">{l.details.note}</p>}
                    <p className="text-[11.5px] text-white/35 mt-1">
                      {bnDateTime(l.created_at)} · {l.actor_email || 'অজানা'}
                    </p>
                  </div>
                </div>
              )}
            />
          )}
        </>
      )}

      {/* ════════ REPORTS TAB ════════ */}
      {tab === 'reports' && (
        <>
          {reports.loading ? (
            <ListSkeleton />
          ) : reports.items.length === 0 ? (
            <EmptyState
              icon="🧾"
              title="কোনো সেভ করা রিপোর্ট নেই"
              sub={'লগ ট্যাব থেকে ফিল্টার করে ⬇ বাটনে চাপলে এখানে জমা থাকবে।'}
            />
          ) : (
            <div className="space-y-2.5">
              {reports.items.map((r) => {
                const per = [
                  r.period_from ? bnDateTime(r.period_from) : null,
                  r.period_to ? bnDateTime(r.period_to) : null,
                ].filter(Boolean).join(' → ');
                return (
                  <div key={r.id} className="glass rounded-xl2 p-3.5 flex items-center gap-3">
                    <button type="button" onClick={() => setViewing(r)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                      <span className="w-11 h-11 rounded-xl2 glass grid place-items-center text-lg shrink-0" aria-hidden="true">🧾</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-white text-[14px] truncate">{r.title}</p>
                        <p className="text-[12.5px] text-white/50 mt-0.5 truncate">
                          {toBn(r.entry_count)} এন্ট্রি · সেভ {bnDateTime(r.created_at)}
                        </p>
                        {per && <p className="text-[11.5px] text-white/35 mt-0.5 truncate">সময়সীমা: {per}</p>}
                      </div>
                    </button>
                    <OverflowMenu
                      items={[
                        { icon: 'eye', label: 'বিস্তারিত দেখুন', onClick: () => setViewing(r) },
                        { icon: 'download', label: 'JSON ডাউনলোড', onClick: () => downloadReport(r) },
                        { icon: 'trash', label: 'ডিলিট করুন', danger: true, divider: true, onClick: () => setDeleting(r) },
                      ]}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* SAVE REPORT SHEET */}
      <AdminSheet
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        title="🧾 রিপোর্ট সেভ করুন"
        sub={`${toBn(logs.items.length)} টি এন্ট্রির স্থায়ী স্ন্যাপশট`}
        footer={
          <>
            <button type="button" onClick={saveReport} disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? 'সেভ হচ্ছে…' : 'সেভ করুন'}
            </button>
            <button type="button" onClick={() => setSaveOpen(false)} className="btn-ghost !px-4">বাতিল</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="field-label">রিপোর্টের নাম</label>
            <input
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              placeholder="যেমন: মাসিক অনুমোদন রিপোর্ট — অক্টোবর"
              className="glass-input !text-base mt-1"
              autoFocus
            />
          </div>
          <div className="bg-black/30 border border-white/[0.08] rounded-xl2 p-3.5 text-[12.5px] text-white/55 space-y-1.5">
            <p>• ধরন: {entityF ? entityLabel(entityF) : 'সব'}</p>
            <p>• কাজ: {actionF ? actionLabel(actionF) : 'সব'}</p>
            <p>• সময়: {dateFrom || 'শুরু নেই'} → {dateTo || 'আজ পর্যন্ত'}</p>
            <p className="text-white/40">• পরে লগ বদলালেও রিপোর্ট অপরিবর্তিত থাকবে</p>
          </div>
          {saveErr && <p className="text-xs text-rose-300 font-semibold">{saveErr}</p>}
        </div>
      </AdminSheet>

      {/* REPORT VIEW SHEET */}
      <AdminSheet
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.title}
        sub={viewing ? `${toBn(viewing.entry_count)} এন্ট্রি · সেভ করেছেন ${viewing.actor_email || '—'}` : ''}
        footer={
          viewing && (
            <>
              <button type="button" onClick={() => downloadReport(viewing)} className="btn-primary flex-1 justify-center">
                <AIcon name="download" size={16} strokeWidth={2.1} className="mr-1.5" /> JSON ডাউনলোড
              </button>
              <OverflowMenu
                items={[
                  { icon: 'trash', label: 'ডিলিট করুন', danger: true, onClick: () => setDeleting(viewing) },
                ]}
              />
            </>
          )
        }
      >
        {viewing && (
          <div>
            <KV k="সেভ" v={bnDateTime(viewing.created_at)} />
            {viewing.period_from && <KV k="শুরু" v={bnDateTime(viewing.period_from)} />}
            {viewing.period_to && <KV k="শেষ" v={bnDateTime(viewing.period_to)} />}
            <KV k="এন্ট্রি" v={toBn(viewing.entry_count)} />
            <p className="field-label mt-4">প্রথম কয়েকটি এন্ট্রি</p>
            <div className="space-y-2 mt-2">
              {(viewing.entries as AuditLog[]).slice(0, 8).map((e, i) => (
                <div key={e.id || i} className="glass rounded-xl2 p-3">
                  <p className="text-[12.5px] font-bold text-white/85">{ACTION_EMOJI[e.action] || '•'} {e.title || '—'}</p>
                  <p className="text-[11.5px] text-white/40 mt-0.5">{bnDateTime(e.created_at)}{e.actor_email ? ` · ${e.actor_email}` : ''}</p>
                </div>
              ))}
              {(viewing.entries as AuditLog[]).length > 8 && (
                <p className="text-[12px] text-white/40 text-center py-2">…আরও {toBn((viewing.entries as AuditLog[]).length - 8)} টি — JSON ডাউনলোডে সব দেখুন</p>
              )}
            </div>
          </div>
        )}
      </AdminSheet>

      {/* DELETE CONFIRM */}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={delReport}
        busy={busyDelete}
        title={`"${(deleting?.title || '').slice(0, 30)}" মুছে ফেলবেন?`}
        body="সেভ করা রিপোর্ট স্থায়ীভাবে মুছে যাবে — ফিরিয়ে আনা যাবে না।"
      />
    </div>
  );
}
