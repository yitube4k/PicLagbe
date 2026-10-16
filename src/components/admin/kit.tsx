import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AIcon, type IconName } from '../../admin/icons';

/* ═══ V19 Admin Android UI kit — per Gemini 4 Argon spec ═══
   Snackbar · BottomSheet · FullDialog (edit) · M3 ConfirmDialog ·
   IconAction (44px target) · OverflowMenu (3-dot) · FilterBar (sticky) ·
   useAdminList (zero-skeleton optimistic) · KV · MediaViewer · waMe */

/* ══════════════════ 1. SNACKBAR ══════════════════ */

type SnackTone = 'success' | 'error' | 'info';
interface Snack { id: number; message: string; tone: SnackTone; action?: { label: string; onClick: () => void } }

const SnackCtx = createContext<{ show: (message: string, opts?: { tone?: SnackTone; action?: Snack['action']; ms?: number }) => void }>({ show: () => {} });
export const useSnack = () => useContext(SnackCtx);

const SNACK_TONE: Record<SnackTone, { icon: IconName; cls: string }> = {
  success: { icon: 'check', cls: 'text-emerald-300' },
  error: { icon: 'alert', cls: 'text-rose-300' },
  info: { icon: 'eye', cls: 'text-sunset-gold' },
};

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [snacks, setSnacks] = useState<Snack[]>([]);
  const idRef = useRef(1);

  const show = useCallback((message: string, opts?: { tone?: SnackTone; action?: Snack['action']; ms?: number }) => {
    const id = idRef.current++;
    const snack: Snack = { id, message, tone: opts?.tone || 'success', action: opts?.action };
    setSnacks((s) => [...s.slice(-1), snack]); // max 2 visible
    window.setTimeout(() => setSnacks((s) => s.filter((x) => x.id !== id)), opts?.ms || (opts?.action ? 6000 : 4000));
  }, []);

  return (
    <SnackCtx.Provider value={{ show }}>
      {children}
      {/* stacked above mobile bottom nav / desktop bottom edge */}
      <div className="fixed left-3 right-3 sm:left-auto sm:right-6 sm:w-[380px] z-[95] flex flex-col gap-2 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:bottom-6 pointer-events-none">
        {snacks.map((s) => (
          <div
            key={s.id}
            role="status"
            className="admin-snack-enter pointer-events-auto flex items-center gap-3 min-h-12 rounded-xl2 glass-strong border border-white/12 shadow-glass-lg px-4 py-2.5"
          >
            <span className={`shrink-0 ${SNACK_TONE[s.tone].cls}`}>
              <AIcon name={SNACK_TONE[s.tone].icon} size={18} strokeWidth={2.1} />
            </span>
            <p className="flex-1 text-[13.5px] font-semibold text-white/90 leading-snug">{s.message}</p>
            {s.action && (
              <button
                type="button"
                onClick={() => { s.action!.onClick(); setSnacks((all) => all.filter((x) => x.id !== s.id)); }}
                className="shrink-0 text-[13px] font-extrabold text-sunset-gold px-2 py-1.5 rounded-full active:scale-95 transition-transform"
              >
                {s.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </SnackCtx.Provider>
  );
}

/* ══════════════════ 2. BOTTOM SHEET (view details) ══════════════════ */

export function AdminSheet({
  open, onClose, title, sub, children, footer, wide, header,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  sub?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
  header?: React.ReactNode;
}) {
  useLockBody(open);
  useEscClose(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm admin-viewer-enter" onClick={onClose} />
      <div className={`admin-sheet-enter relative w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'} glass-strong rounded-t-xl3 sm:rounded-xl3 border-t sm:border border-white/15 shadow-glass-lg flex flex-col max-h-[90dvh]`}>
        {/* drag handle (mobile affordance) */}
        <div className="pt-2.5 sm:hidden shrink-0"><div className="w-10 h-1 bg-white/20 rounded-full mx-auto" /></div>
        {(title || header) && (
          <div className="shrink-0 flex items-center justify-between gap-3 px-5 pt-3 pb-3 border-b border-white/[0.07]">
            {header || (
              <div className="min-w-0">
                <h3 className="font-extrabold text-white text-[16.5px] leading-snug truncate">{title}</h3>
                {sub && <p className="text-[12.5px] text-white/50 mt-0.5 truncate">{sub}</p>}
              </div>
            )}
            <button type="button" onClick={onClose} aria-label="বন্ধ করুন"
              className="shrink-0 w-10 h-10 rounded-full grid place-items-center text-white/60 hover:text-white hover:bg-white/[0.07] transition-colors">
              <AIcon name="close" size={17} strokeWidth={2} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer && (
          <div className="shrink-0 sticky bottom-0 bg-twilight-900/90 backdrop-blur-md border-t border-white/10 px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] rounded-b-xl3 flex items-center gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ══════════════════ 3. FULL DIALOG (edit forms — keyboard/IME safe) ══════════════════ */

export function FullDialog({
  open, onClose, title, sub, children, onSave, saving, saveLabel = 'সংরক্ষণ করুন', dirty = true, err, wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  sub?: string;
  children: React.ReactNode;
  onSave?: () => void;
  saving?: boolean;
  saveLabel?: string;
  dirty?: boolean;
  err?: string | null;
  wide?: boolean;
}) {
  useLockBody(open);
  useEscClose(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[85] bg-twilight-950 flex items-stretch sm:items-center sm:justify-center sm:p-6" role="dialog" aria-modal="true">
      <div className={`admin-fs-enter relative flex flex-col w-full h-full sm:h-auto sm:max-h-[88dvh] ${wide ? 'sm:max-w-3xl' : 'sm:max-w-xl'} sm:glass-strong sm:rounded-xl3 sm:border sm:border-white/12 sm:shadow-glass-lg overflow-hidden bg-twilight-950`}>
        {/* top app bar — X left (one-handed reach), title, NO save in header */}
        <div className="shrink-0 h-14 px-2 flex items-center gap-2 border-b border-white/[0.07] bg-twilight-900/95">
          <button type="button" onClick={onClose} aria-label="বন্ধ করুন"
            className="w-11 h-11 rounded-full grid place-items-center text-white/70 hover:text-white hover:bg-white/[0.07] transition-colors">
            <AIcon name="close" size={19} strokeWidth={2.1} />
          </button>
          <div className="min-w-0 flex-1">
            <h3 className="font-extrabold text-white text-[16px] leading-tight truncate">{title}</h3>
            {sub && <p className="text-[11.5px] text-white/45 leading-tight truncate">{sub}</p>}
          </div>
        </div>
        {/* scrollable form body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-5">{children}</div>
        {/* sticky save bar pinned above keyboard */}
        {onSave && (
          <div className="shrink-0 sticky bottom-0 bg-twilight-900/95 backdrop-blur-md border-t border-white/10 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            {err && <p className="text-xs text-rose-300 font-semibold mb-2">{err}</p>}
            <div className="flex gap-2.5">
              <button type="button" onClick={onSave} disabled={saving || !dirty}
                className="btn-primary flex-1 justify-center disabled:opacity-45">
                {saving ? <span className="inline-flex items-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />সেভ হচ্ছে…</span> : saveLabel}
              </button>
              <button type="button" onClick={onClose} className="btn-ghost !px-5">বাতিল</button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ══════════════════ 4. M3 CONFIRM DIALOG (destructive) ══════════════════ */

export function ConfirmDialog({
  open, onClose, onConfirm, title, body, confirmLabel = 'মুছে ফেলুন', cancelLabel = 'বাতিল', tone = 'danger', icon = 'trash', busy,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  icon?: IconName;
  busy?: boolean;
}) {
  useEscClose(open, onClose);
  if (!open) return null;
  const filled = tone === 'danger'
    ? 'bg-rose-500 text-white hover:bg-rose-400'
    : 'btn-primary';
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-6" role="alertdialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm admin-viewer-enter" onClick={busy ? undefined : onClose} />
      <div className="admin-dialog-enter relative w-full max-w-[340px] rounded-[28px] border border-white/15 shadow-glass-lg px-6 pt-6 pb-4 text-center bg-twilight-900/95 backdrop-blur-2xl">
        <div className={`w-12 h-12 mx-auto rounded-full grid place-items-center mb-3 ${tone === 'danger' ? 'bg-rose-500/15 text-rose-300' : 'bg-sunset-soft text-sunset-gold'}`}>
          <AIcon name={icon} size={22} strokeWidth={2} />
        </div>
        <h3 className="text-[16.5px] font-extrabold text-white leading-snug">{title}</h3>
        {body && <p className="text-[13.5px] text-white/60 mt-2 leading-relaxed">{body}</p>}
        <div className="flex items-center justify-end gap-2 mt-5">
          <button type="button" onClick={onClose} disabled={busy}
            className="h-10 px-4 rounded-full text-sm font-bold text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors">
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={busy}
            className={`h-10 px-5 rounded-full text-sm font-bold transition-colors active:scale-95 ${filled} disabled:opacity-50`}>
            {busy ? 'হচ্ছে…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ══════════════════ 5. ICON ACTION (44px touch target) ══════════════════ */

const IA_TONE: Record<string, string> = {
  default: 'text-white/65 hover:text-white hover:bg-white/[0.08]',
  gold: 'text-sunset-gold hover:bg-sunset-gold/15',
  emerald: 'text-emerald-300 hover:bg-emerald-400/15',
  danger: 'text-rose-300 hover:bg-rose-400/15',
  solid: 'bg-sunset-gradient text-[#1A0E06] shadow-sunset-glow hover:brightness-110',
};

export function IconAction({
  icon, label, onClick, tone = 'default', size = 20, className = '', disabled,
}: {
  icon: IconName;
  label: string;
  onClick?: (e: React.MouseEvent) => void;
  tone?: keyof typeof IA_TONE;
  size?: number;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`w-11 h-11 rounded-full grid place-items-center transition-colors active:scale-90 disabled:opacity-40 disabled:pointer-events-none ${IA_TONE[tone]} ${className}`}
    >
      <AIcon name={icon} size={size} strokeWidth={2} />
    </button>
  );
}

/* ══════════════════ 6. OVERFLOW MENU (3-dot) ══════════════════ */

export interface OverflowItem {
  icon?: IconName;
  label: string;
  onClick?: () => void;
  danger?: boolean;
  divider?: boolean;
  checked?: boolean;
  hide?: boolean;
}

export function OverflowMenu({ items, align = 'right' }: { items: OverflowItem[]; align?: 'right' | 'left' }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null);
  const ref = useRef<HTMLButtonElement>(null);

  const toggle = () => {
    if (open) { setOpen(false); return; }
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const menuH = Math.min(items.filter((i) => !i.hide).length * 44 + 12, 320);
    const up = r.bottom + menuH > window.innerHeight - 70;
    setPos({
      top: up ? r.top - menuH - 6 : r.bottom + 6,
      left: align === 'right' ? Math.max(10, r.right - 210) : r.left,
      up,
    });
    setOpen(true);
  };

  // outside click / scroll / Esc close — V20: named handlers, ALL removed on cleanup (leak fix)
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (!ref.current?.parentElement?.contains(e.target as Node) && !(e.target instanceof Element && e.target.closest('.admin-overflow-pop'))) close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={toggle}
        aria-label="আরও অ্যাকশন"
        aria-expanded={open}
        className={`w-11 h-11 rounded-full grid place-items-center transition-colors active:scale-90 ${open ? 'text-sunset-gold bg-sunset-gold/15' : 'text-white/55 hover:text-white hover:bg-white/[0.08]'}`}
      >
        <AIcon name="more" size={20} />
      </button>
      {open && pos && createPortal(
        <div
          className="admin-overflow-pop admin-menu-enter fixed z-[92] min-w-[200px] max-w-[240px] glass-strong rounded-xl2 border border-white/12 shadow-glass-lg py-1.5"
          style={{ top: pos.top, left: pos.left }}
          role="menu"
        >
          {items.filter((i) => !i.hide).map((it, idx) => (
            <React.Fragment key={it.label + idx}>
              {it.divider && <div className="my-1.5 border-t border-white/[0.08]" />}
              <button
                type="button"
                role="menuitem"
                onClick={() => { setOpen(false); it.onClick?.(); }}
                className={`w-full h-11 px-4 flex items-center gap-3 text-left text-[13.5px] font-semibold transition-colors ${
                  it.danger ? 'text-rose-300 hover:bg-rose-400/10' : 'text-white/85 hover:bg-white/[0.07]'
                }`}
              >
                {it.icon && <AIcon name={it.icon} size={17} strokeWidth={it.checked ? 2.3 : 1.9} />}
                <span className="flex-1 truncate">{it.label}</span>
                {it.checked && <AIcon name="check" size={16} strokeWidth={2.4} className="text-sunset-gold" />}
              </button>
            </React.Fragment>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}

/* ══════════════════ 7. STICKY FILTER BAR ══════════════════ */

export function FilterBar({
  q, onQ, placeholder = 'খুঁজুন…', chips, activeChip, onChip, right, children,
}: {
  q?: string;
  onQ?: (v: string) => void;
  placeholder?: string;
  chips?: { key: string; label: string; count?: number }[];
  activeChip?: string;
  onChip?: (k: string) => void;
  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] lg:top-0 z-20 -mx-3 sm:-mx-6 lg:-mx-8 px-3 sm:px-6 lg:px-8 py-2.5 bg-twilight-950/85 backdrop-blur-md border-b border-white/[0.06] mb-4">
      {(onQ || right) && (
        <div className="flex items-center gap-2">
          {onQ && (
            <div className="relative flex-1 min-w-0">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none">
                <AIcon name="search" size={16} />
              </span>
              <input
                type="text"
                value={q || ''}
                onChange={(e) => onQ!(e.target.value)}
                placeholder={placeholder}
                className="glass-input !rounded-full !pl-10 w-full !min-h-[42px] !text-[14px]"
              />
              {q && (
                <button type="button" onClick={() => onQ('')} aria-label="মুছুন"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full grid place-items-center text-white/45 hover:text-white">
                  <AIcon name="close" size={13} strokeWidth={2.2} />
                </button>
              )}
            </div>
          )}
          {right}
        </div>
      )}
      {chips && chips.length > 0 && (
        <div className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar ${onQ || right ? 'mt-2' : ''}`}>
          {chips.map((c) => {
            const active = activeChip === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => onChip?.(c.key)}
                className={`shrink-0 h-8 px-3.5 rounded-full text-[12.5px] font-bold whitespace-nowrap border transition-colors inline-flex items-center gap-1.5 ${
                  active
                    ? 'bg-sunset-soft border-sunset-gold/45 text-sunset-gold'
                    : 'bg-white/[0.04] border-white/10 text-white/60 hover:text-white/90'
                }`}
              >
                {active && <AIcon name="check" size={13} strokeWidth={2.5} />}
                {c.label}
                {c.count != null && c.count > 0 && (
                  <span className={`min-w-[17px] h-[17px] px-1 rounded-full text-[10px] font-extrabold grid place-items-center tabular-nums ${active ? 'bg-sunset-gold text-twilight-950' : 'bg-white/10 text-white/60'}`}>
                    {c.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
      {children}
    </div>
  );
}

/* ══════════════════ 8. LIST HOOK — zero-skeleton optimistic + V20 perf (SWR cache, single-flight) ══════════════════ */

/* V20 — module-level SWR cache + in-flight dedup keyed by fetcher identity.
   Same useCallback(fetcher) instance = same query → rapid section remounts and
   duplicate effects NEVER stack parallel fetches (low-end Android hang fix). */
const listCache = new WeakMap<() => Promise<unknown[]>, { data: unknown[]; ts: number }>();
const listInflight = new WeakMap<() => Promise<unknown[]>, Promise<unknown[]>>();
const LIST_STALE_MS = 15_000;

export function useAdminList<T extends { id: string }>(fetcher: () => Promise<T[]>, deps: unknown[]) {
  const [items, setItems] = useState<T[]>(() => (listCache.get(fetcher)?.data as T[]) || []);
  const [loading, setLoading] = useState(() => !listCache.get(fetcher));
  const [error, setError] = useState<string | null>(null);
  const [shakeId, setShakeId] = useState<string | null>(null);
  const alive = useRef(true);
  const first = useRef(true);

  const load = useCallback(async (silent = false, force = false) => {
    if (!silent) {
      const cached = listCache.get(fetcher);
      if (!force && cached && Date.now() - cached.ts < LIST_STALE_MS) {
        // SWR: fresh cache → instant paint, zero skeleton (fast section back-navigation)
        setItems(cached.data as T[]); setError(null); setLoading(false);
        return;
      }
      setLoading(true);
    }
    try {
      // single-flight: reuse an identical in-flight request instead of stacking a new one
      let prom = listInflight.get(fetcher);
      if (!prom) {
        prom = fetcher().then((d) => {
          listCache.set(fetcher, { data: (d as unknown[]) || [], ts: Date.now() });
          listInflight.delete(fetcher);
          return d;
        }).catch((e) => { listInflight.delete(fetcher); throw e; });
        listInflight.set(fetcher, prom);
      }
      const data = await prom;
      if (alive.current) { setItems((data as T[]) || []); setError(null); }
    } catch (e) {
      if (alive.current) setError((e as Error)?.message || 'লোড ব্যর্থ হয়েছে');
    } finally {
      if (alive.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    alive.current = true;
    if (first.current) { first.current = false; load(); }
    else load(true); // filter/search changes: silent, keep list visible
    return () => { alive.current = false; };
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = useCallback((id: string, p: Partial<T>) => {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...p } : x)));
  }, []);
  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);
  const prepend = useCallback((item: T) => setItems((prev) => [item, ...prev]), []);
  const shake = useCallback((id: string) => {
    setShakeId(id);
    window.setTimeout(() => setShakeId(null), 420);
  }, []);

  /** মিউটেশনের পর সত্যিকারের রিফ্রেশ — ক্যাশ বাইপাস করে নেটওয়ার্কে যায় */
  const silentReload = useCallback(() => load(true, true), [load]);

  return { items, setItems, loading, error, reload: load, silentReload, patch, remove, prepend, shakeId, shake };
}

/* rollback helper — wrap a mutation; on error re-sync from DB, shake row, error snack */
export function useOptimistic() {
  const { show } = useSnack();
  return useMemo(() => ({
    /** run mutation with optimistic patch + rollback via silent reload */
    run: async (opts: {
      patchFn: () => void;
      mutate: () => PromiseLike<{ error: { message: string } | null }>;
      okMsg: string;
      errMsg?: string;
      reload?: () => void;
    }) => {
      const { patchFn, mutate, okMsg, errMsg, reload } = opts;
      patchFn(); // optimistic local update first
      const { error } = await mutate();
      if (error) {
        reload?.(); // silently restore truth from DB
        show(errMsg || 'আপডেট ব্যর্থ হয়েছে — আবার চেষ্টা করুন', { tone: 'error' });
        return false;
      }
      if (okMsg) show(okMsg, { tone: 'success' });
      return true;
    },
    show,
  }), [show]);
}

/* ══════════════════ 9. small pieces ══════════════════ */

export function KV({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-white/[0.05] last:border-0">
      <span className="text-[12.5px] font-semibold text-white/45 shrink-0 pt-0.5">{k}</span>
      <span className={`text-[13.5px] font-medium text-white/90 text-right break-words min-w-0 ${mono ? 'font-mono text-[12.5px]' : ''}`}>{v || '—'}</span>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
      {hint && <p className="text-[12px] text-white/40 mt-1">{hint}</p>}
    </div>
  );
}

const PILL_STYLES: Record<string, string> = {
  pending: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  approved: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  rejected: 'border-rose-400/30 bg-rose-400/10 text-rose-300',
  blocked: 'border-orange-400/30 bg-orange-400/10 text-orange-300',
  banned: 'border-rose-500/40 bg-rose-500/15 text-rose-300',
  accepted: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  completed: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
  cancelled: 'border-white/20 bg-white/5 text-white/60',
  customer: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
  photographer: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  admin: 'border-sunset-gold/40 bg-sunset-soft text-sunset-gold',
};

const PILL_BN: Record<string, string> = {
  pending: 'পেন্ডিং',
  approved: 'অ্যাপ্রুভড',
  rejected: 'বাতিল',
  blocked: 'ব্লকড',
  banned: 'ব্যানড',
  accepted: 'গৃহীত',
  completed: 'সম্পন্ন',
  cancelled: 'বাতিল',
  customer: 'ইউজার',
  photographer: 'ফটোগ্রাফার',
  admin: 'অ্যাডমিন',
};

export function StatusPill({ status, busy }: { status: string; busy?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-bold whitespace-nowrap ${busy ? 'admin-busy' : ''} ${
        PILL_STYLES[status] || 'border-white/20 bg-white/5 text-white/60'
      }`}
    >
      {PILL_BN[status] || status}
    </span>
  );
}

export function EmptyState({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div className="glass rounded-xl3 p-10 text-center">
      <div className="text-3xl mb-3">{icon}</div>
      <p className="font-semibold text-white/85">{title}</p>
      {sub && <p className="text-sm text-white/50 mt-1">{sub}</p>}
    </div>
  );
}

export function ListSkeleton({ rows = 4, h = 'h-[72px]' }: { rows?: number; h?: string }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`skeleton ${h} rounded-xl2`} />
      ))}
    </div>
  );
}

/* ══════════════════ V20 PROGRESSIVE LIST — Android hang fix ══════════════════
   বড় লিস্ট (১৫০–৩০০ রো) একবারে রেন্ডার করলে লো-এন্ড ফোন আটকে যায়।
   প্রথমে ৩০টি, "আরও দেখুন" বাটনে +৩০। ফিল্টার বদলালে আবার ৩০ থেকে শুরু। */
export function useProgressiveList<T>(items: T[], chunkSize = 30, resetKey?: unknown) {
  const [visible, setVisible] = useState(chunkSize);
  useEffect(() => { setVisible(chunkSize); }, [chunkSize, resetKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const visibleItems = useMemo(() => items.slice(0, visible), [items, visible]);
  const hasMore = visible < items.length;
  const remaining = Math.max(0, items.length - visible);
  const loadMore = useCallback(() => setVisible((v) => Math.min(v + chunkSize, items.length)), [chunkSize, items.length]);
  return { visibleItems, hasMore, remaining, loadMore };
}

export function ProgressiveRows<T extends { id: string }>({
  items, renderRow, resetKey, chunkSize = 30, className = 'space-y-2.5',
}: {
  items: T[];
  renderRow: (item: T) => React.ReactNode;
  resetKey?: unknown;
  chunkSize?: number;
  className?: string;
}) {
  const { visibleItems, hasMore, remaining, loadMore } = useProgressiveList(items, chunkSize, resetKey);
  return (
    <div className={className}>
      {visibleItems.map((item) => renderRow(item))}
      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          className="w-full h-12 rounded-xl2 bg-white/[0.06] border border-white/10 text-[13.5px] font-bold text-white/75 hover:text-white hover:bg-white/[0.09] active:scale-[0.99] transition-all inline-flex items-center justify-center gap-2"
        >
          <AIcon name="chevron" size={15} className="rotate-90" />
          আরও দেখুন
          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-white/10 text-[11px] font-extrabold grid place-items-center tabular-nums">
            {toBnNum(remaining)}
          </span>
        </button>
      )}
    </div>
  );
}

/** ছোট বাংলা সংখ্যা হেল্পার (kit অভ্যন্তরীণ — utils-এর সার্কুলার ইমপোর্ট এড়াতে) */
function toBnNum(n: number): string {
  return String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]);
}

export function SectionHead({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h2 className="section-head !mb-0">{title}</h2>
        {sub && <p className="section-sub mt-1 !mt-1.5">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/* ══════════════════ 10. MEDIA VIEWER (KYC docs etc.) ══════════════════ */

export function MediaViewer({ src, title, onClose }: { src: string | null; title?: string; onClose: () => void }) {
  useLockBody(!!src);
  useEscClose(!!src, onClose);
  if (!src) return null;
  const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(src);
  return createPortal(
    <div className="admin-viewer-enter fixed inset-0 z-[96] bg-black/92 backdrop-blur-sm flex flex-col" role="dialog" aria-modal="true">
      <div className="h-14 px-2 flex items-center justify-between border-b border-white/10">
        <p className="text-sm font-bold text-white/85 px-3 truncate">{title || 'ডকুমেন্ট'}</p>
        <button type="button" onClick={onClose} aria-label="বন্ধ করুন"
          className="w-11 h-11 rounded-full grid place-items-center text-white/75 hover:text-white hover:bg-white/10">
          <AIcon name="close" size={19} strokeWidth={2.1} />
        </button>
      </div>
      <div className="flex-1 overflow-auto grid place-items-center p-4">
        {isVideo ? (
          <video src={src} controls autoPlay className="max-w-full max-h-full rounded-xl" />
        ) : (
          <img src={src} alt={title || ''} className="max-w-full max-h-full object-contain rounded-xl" />
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ══════════════════ hooks + phone helpers ══════════════════ */

function useLockBody(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [active]);
}

function useEscClose(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, onClose]);
}

/** render children in a body portal — escapes transformed/stacking ancestors */
function OverlayPortal({ children }: { children: React.ReactNode }) {
  return createPortal(children, document.body);
}

/** normalize BD phone → wa.me international (8801XXXXXXXXX) */
export function waMe(phone?: string | null, text = 'আসসালামু আলাইকুম! আপনার প্রোফাইল দেখে যোগাযোগ করছি (PicLagbe)'): string | null {
  if (!phone) return null;
  let d = phone.replace(/\D/g, '');
  if (d.startsWith('880')) d = d.slice(3);
  else if (d.startsWith('0')) d = d.slice(1);
  if (d.length !== 10) return null;
  return `https://wa.me/880${d}?text=${encodeURIComponent(text)}`;
}

export function telHref(phone?: string | null): string | null {
  if (!phone) return null;
  const d = phone.replace(/[^\d+]/g, '');
  return d.length >= 6 ? `tel:${d}` : null;
}
