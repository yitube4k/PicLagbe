import React, { useEffect } from 'react';

/* ═══ Admin panel shared kit — modal, field, status pill, empty state ═══ */

export function AdminModal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative glass-strong rounded-t-2xl sm:rounded-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[92vh] overflow-y-auto shadow-glass-lg`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-b border-white/[0.08] bg-twilight-900/95 backdrop-blur rounded-t-2xl">
          <h3 className="font-bold text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="বন্ধ করুন"
            className="w-8 h-8 rounded-full glass flex items-center justify-center text-white/70 hover:text-white"
          >
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
      {hint && <p className="text-[12.5px] text-white/40 mt-1">{hint}</p>}
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

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12.5px] font-bold ${
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

export function DangerConfirm({
  onConfirm,
  label = 'ডিলিট',
  message = 'নিশ্চিত? এটি ফিরিয়ে আনা যাবে না।',
}: {
  onConfirm: () => void;
  label?: string;
  message?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        if (window.confirm(message)) onConfirm();
      }}
      className="text-xs font-semibold text-rose-300/90 hover:text-rose-300 hover:underline"
    >
      🗑 {label}
    </button>
  );
}
