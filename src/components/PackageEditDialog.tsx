import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { Package, PackageMedia, PricingUnit } from '../lib/types';
import { uploadToCloudinary, cldConfigured, cldUrl } from '../lib/cloudinary';
import { toBn } from '../lib/utils';
import { UNIT_LABEL } from '../lib/pricing';
import { AIcon } from '../admin/icons';
import { FullDialog } from './admin/kit';

/**
 * V21 — প্যাকেজ তৈরি/এডিট ডায়ালগ (StudioDash + Admin দুই জায়গায় ব্যবহৃত)।
 * Argon spec: IME-safe chip input, 3-col media picker (max 8, cover badge,
 * per-tile progress, video 35MB guard), is_popular toggle, sticky save bar.
 * DB triggers: MAX_6_PACKAGES + single is_popular enforced server-side.
 */

const MAX_MEDIA = 8;
const FEATURE_SUGGESTIONS = ['সব Raw ছবি', 'সিনেম্যাটিক রিল', 'এডিটেড ছবি', 'ড্রোন শট'];

/** V30 — প্রাইসিং ইউনিট অপশন (ছোট ব্যাখ্যা সহ) */
const UNIT_OPTIONS: { key: PricingUnit; hint: string }[] = [
  { key: 'event', hint: 'পুরো সেশনের এক দাম — যেমন: ৫,০০০৳ কাপল প্যাকেজ' },
  { key: 'hour', hint: 'ঘণ্টা হিসাবে দাম — ক্লায়েন্ট ঘণ্টা বাড়াতে পারবে' },
  { key: 'photo', hint: 'ছবি হিসাবে দাম — ক্লায়েন্ট ছবির সংখ্যা ঠিক করবে' },
];

export function videoThumb(url: string): string {
  // Cloudinary video → auto poster frame (.jpg via so_auto)
  if (url.includes('/video/upload/')) {
    const [base, rest] = url.split('/video/upload/');
    const chain = rest.replace(/^[^/]*\/?/, (m) => (rest.startsWith('http') || rest.startsWith('/') ? '' : m));
    void chain;
    const parts = rest.split('/');
    if (/^[a-z_0-9,]+$/i.test(parts[0]) && !parts[0].includes('.')) parts.shift(); // strip old transforms
    return `${base}/video/upload/so_auto,w_400,h_250,c_fill/${parts.join('/').replace(/\.(mp4|webm|mov)(\?.*)?$/i, '.jpg')}`;
  }
  return url;
}

interface PackageEditDialogProps {
  open: boolean;
  photographerId: string;
  editing: Package | null; // null = create
  existingCount: number;
  onClose: () => void;
  onSaved: (pkg: Package, mode: 'created' | 'updated') => void;
}

export default function PackageEditDialog({ open, photographerId, editing, existingCount, onClose, onSaved }: PackageEditDialogProps) {
  const [name, setName] = useState(editing?.name || '');
  const [price, setPrice] = useState(editing?.price != null ? String(editing.price) : '');
  const [duration, setDuration] = useState(editing?.duration_hours != null ? String(editing.duration_hours) : '2');
  const [unit, setUnit] = useState<PricingUnit>(editing?.pricing_unit || 'event');
  const [photoCount, setPhotoCount] = useState(editing?.photo_count != null ? String(editing.photo_count) : '');
  const [desc, setDesc] = useState(editing?.description || '');
  const [features, setFeatures] = useState<string[]>(editing?.features || []);
  const [featureText, setFeatureText] = useState('');
  const [media, setMedia] = useState<PackageMedia[]>(editing?.media || []);
  const [popular, setPopular] = useState(editing?.is_popular || false);

  const [uploading, setUploading] = useState(0); // files in flight
  const [uploadPct, setUploadPct] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const dirty = useMemo(() => {
    if (!editing) return true;
    return (
      name !== editing.name ||
      price !== String(editing.price) ||
      duration !== String(editing.duration_hours ?? '') ||
      unit !== (editing.pricing_unit || 'event') ||
      photoCount !== String(editing.photo_count ?? '') ||
      desc !== (editing.description || '') ||
      JSON.stringify(features) !== JSON.stringify(editing.features || []) ||
      JSON.stringify(media) !== JSON.stringify(editing.media || []) ||
      popular !== !!editing.is_popular
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, price, duration, unit, photoCount, desc, features, media, popular, editing]);

  /* ── features chip input (IME-safe: explicit button + comma/dari/Enter-not-composing) ── */
  const addFeature = (raw?: string) => {
    const t = (raw ?? featureText).trim().replace(/[,।]+$/, '').trim();
    if (!t) return;
    if (features.includes(t)) { setFeatureText(''); return; }
    if (features.length >= 10) { setErr('সর্বোচ্চ ১০টি সুবিধা যোগ করা যায়'); return; }
    setFeatures((prev) => [...prev, t]);
    setFeatureText('');
    setErr(null);
  };
  const onFeatureKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter') { e.preventDefault(); addFeature(); }
    else if (e.key === ',' || e.key === '।') { e.preventDefault(); addFeature(); }
  };

  /* ── media upload (Cloudinary unsigned, folder piclagbe/packages) ── */
  const uploadFiles = async (files: FileList | File[]) => {
    setErr(null);
    const list = Array.from(files);
    if (media.length + list.length > MAX_MEDIA) {
      setErr(`সর্বোচ্চ ${toBn(MAX_MEDIA)}টি ছবি/ভিডিও যোগ করা যায়`);
      return;
    }
    setUploading(list.length);
    try {
      for (const f of list) {
        const isVideo = f.type.startsWith('video/');
        if (isVideo && f.size > 35 * 1024 * 1024) {
          setErr('ভিডিও ৩৫ মেগাবাইটের কম হতে হবে');
          continue;
        }
        if (!isVideo && f.size > 10 * 1024 * 1024) {
          setErr('ছবি ১০ মেগাবাইটের কম হতে হবে');
          continue;
        }
        const key = `${f.name}-${f.size}-${Math.random()}`;
        setUploadPct((p) => ({ ...p, [key]: 5 }));
        const res = await uploadToCloudinary(f, 'piclagbe/packages', (pct) => {
          setUploadPct((p) => ({ ...p, [key]: Math.max(8, pct) }));
        });
        setMedia((prev) => [...prev, { url: res.url, type: res.resourceType as 'image' | 'video' }]);
        setUploadPct((p) => { const q = { ...p }; delete q[key]; return q; });
      }
    } catch (e) {
      setErr((e as Error).message || 'আপলোড ব্যর্থ');
    } finally {
      setUploading(0);
      setUploadPct({});
    }
  };

  const makeCover = (idx: number) => {
    setMedia((prev) => {
      const item = prev[idx];
      if (!item || idx === 0) return prev;
      return [item, ...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });
  };

  const save = async () => {
    setErr(null);
    if (!name.trim()) { setErr('প্যাকেজের নাম দিন'); return; }
    if (!price || Number(price) <= 0) { setErr('মূল্য দিন'); return; }
    const pc = photoCount.trim() ? Number(photoCount) : null;
    if (pc != null && (pc < 1 || pc > 500)) { setErr('ছবির সংখ্যা ১–৫০০ এর মধ্যে দিন'); return; }
    setSaving(true);
    try {
      const payload = {
        photographer_id: photographerId,
        name: name.trim(),
        description: desc.trim() || null,
        price: Number(price),
        duration_hours: unit === 'event' ? (Number(duration) || 2) : (Number(duration) || null),
        pricing_unit: unit,
        photo_count: unit === 'photo' ? null : pc,
        features,
        media,
        is_popular: popular,
        sort_order: editing?.sort_order ?? existingCount,
      };
      let data: Package | null = null;
      if (editing) {
        const { data: d, error } = await supabase.from('packages').update(payload).eq('id', editing.id).select().single();
        if (error) throw error;
        data = d as Package;
      } else {
        const { data: d, error } = await supabase.from('packages').insert(payload).select().single();
        if (error) throw error;
        data = d as Package;
      }
      onSaved(data, editing ? 'updated' : 'created');
    } catch (e) {
      const msg = (e as Error).message || '';
      setErr(msg.includes('MAX_6_PACKAGES')
        ? 'সর্বোচ্চ ৬টি প্যাকেজ রাখা যায় — আগে কোনো একটি ডিলিট করুন'
        : msg || 'সেভ ব্যর্থ');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <FullDialog
      open={open}
      onClose={onClose}
      title={editing ? 'প্যাকেজ এডিট করুন' : 'নতুন প্যাকেজ'}
      sub={editing ? undefined : `আপনার ${toBn(existingCount)}/৬ প্যাকেজ ব্যবহৃত`}
      onSave={save}
      saving={saving || uploading > 0}
      dirty={dirty}
      err={err}
      saveLabel={uploading > 0 ? `আপলোড হচ্ছে… (${toBn(MAX_MEDIA - media.length)} বাকি)` : 'প্যাকেজ সংরক্ষণ করুন'}
      wide
    >
      <div className="space-y-5">
        {/* নাম + জনপ্রিয় */}
        <div>
          <label className="field-label">প্যাকেজের নাম *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="যেমন: কাপল গোল্ড প্যাকেজ" className="glass-input" maxLength={60} />
        </div>

        {/* V30 — প্রাইসিং ইউনিট */}
        <div>
          <label className="field-label">দামের ধরন *</label>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="দামের ধরন">
            {UNIT_OPTIONS.map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => setUnit(o.key)}
                aria-pressed={unit === o.key}
                className={[
                  'rounded-xl border px-2 py-2.5 text-center transition',
                  unit === o.key
                    ? 'border-sunset-gold/70 bg-sunset-soft text-sunset-gold font-bold'
                    : 'border-white/10 bg-white/[0.04] text-white/65 hover:border-white/25 hover:text-white',
                ].join(' ')}
              >
                <span className="block text-[13.5px] leading-tight">{UNIT_LABEL[o.key]}</span>
              </button>
            ))}
          </div>
          <p className="text-[11.5px] text-white/45 mt-1.5 leading-relaxed">
            {UNIT_OPTIONS.find((o) => o.key === unit)?.hint}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">
              {unit === 'hour' ? 'মূল্য (৳/ঘণ্টা) *' : unit === 'photo' ? 'মূল্য (৳/ছবি) *' : 'মূল্য (৳) *'}
            </label>
            <input type="number" inputMode="numeric" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder={unit === 'photo' ? '১০০' : '৪০০০'} className="glass-input" />
          </div>
          <div>
            <label className="field-label">{unit === 'hour' ? 'সাজেস্টেড ঘণ্টা' : 'সময়কাল (ঘণ্টা)'}</label>
            <input type="number" inputMode="numeric" min={1} max={24} value={duration} onChange={(e) => setDuration(e.target.value)} className="glass-input" />
          </div>
        </div>

        {/* অন্তর্ভুক্ত ছবি (photo ইউনিটে লুকানো — ক্লায়েন্ট নিজেই সংখ্যা ঠিক করে) */}
        {unit !== 'photo' && (
          <div>
            <label className="field-label">অন্তর্ভুক্ত ছবি (ঐচ্ছিক)</label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={500}
              value={photoCount}
              onChange={(e) => setPhotoCount(e.target.value)}
              placeholder="যেমন: ১০ — খালি রাখলে দেখাবে না"
              className="glass-input"
            />
            <p className="text-[11.5px] text-white/45 mt-1.5 leading-relaxed">ক্লায়েন্ট প্যাকেজ কার্ডে "১০ ছবি অন্তর্ভুক্ত" লেখা দেখবে।</p>
          </div>
        )}

        <div>
          <label className="field-label">বিবরণ</label>
          <textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="প্যাকেজে কী কী থাকছে সংক্ষেপে লিখুন..." className="glass-input resize-none" maxLength={220} />
        </div>

        {/* সুবিধা chip input */}
        <div>
          <label className="field-label">সুবিধাসমূহ ({toBn(features.length)})</label>
          <div className="relative">
            <input
              value={featureText}
              onChange={(e) => setFeatureText(e.target.value)}
              onKeyDown={onFeatureKey}
              placeholder="লিখুন তারপর + যোগ চাপুন"
              className="glass-input pr-20"
            />
            <button
              type="button"
              onClick={() => addFeature()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 px-3 rounded-lg bg-sunset-soft text-sunset-gold text-xs font-bold hover:bg-sunset-gold hover:text-white transition flex items-center gap-1"
            >
              <AIcon name="check" size={13} strokeWidth={2.5} /> যোগ
            </button>
          </div>
          {features.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {features.map((f, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 h-8 pl-3 pr-1.5 rounded-full bg-white/[0.07] border border-white/12 text-[12.5px] text-white/85">
                  {f}
                  <button type="button" onClick={() => setFeatures((prev) => prev.filter((_, j) => j !== i))} aria-label={`${f} মুছুন`} className="w-6 h-6 rounded-full grid place-items-center text-white/50 hover:text-rose-300 hover:bg-rose-500/15">
                    <AIcon name="xmark" size={11} strokeWidth={2.4} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {FEATURE_SUGGESTIONS.filter((s) => !features.includes(s)).map((s) => (
              <button key={s} type="button" onClick={() => addFeature(s)} className="chip !py-1 !px-2.5 !text-[11.5px] text-white/55 hover:text-sunset-gold border-dashed">
                + {s}
              </button>
            ))}
          </div>
        </div>

        {/* রেফারেন্স মিডিয়া */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="field-label !mb-0">রেফারেন্স ছবি/ভিডিও ({toBn(media.length)}/{toBn(MAX_MEDIA)})</label>
            {media.length < MAX_MEDIA && cldConfigured() && (
              <button type="button" onClick={() => fileRef.current?.click()} className="text-xs font-bold text-sunset-gold hover:text-sunset-soft flex items-center gap-1.5 py-2 px-1" disabled={uploading > 0}>
                <AIcon name="external" size={13} strokeWidth={2.2} /> আপলোড
              </button>
            )}
          </div>
          <p className="text-[11.5px] text-white/40 mb-2.5 leading-relaxed">ক্লায়েন্ট প্যাকেজ দেখে বুক করে — আপনার সেরা কাজের নমুনা দিন (ছবি ১০MB, ভিডিও ৩৫MB)</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => { if (e.target.files?.length) { uploadFiles(e.target.files); e.target.value = ''; } }}
          />
          <div className="grid grid-cols-3 gap-2">
            {media.map((m, i) => (
              <div key={`${m.url}-${i}`} className="relative aspect-square rounded-xl overflow-hidden border border-white/12 bg-twilight-800 group">
                  {m.type === 'image' ? (
                    <img src={cldUrl(m.url, { w: 320, c: 'fill' })} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <>
                      <img src={videoThumb(m.url)} alt="" className="w-full h-full object-cover" loading="lazy" />
                      <span className="absolute bottom-1 left-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white flex items-center gap-0.5">▶ ভিডিও</span>
                    </>
                  )}
                  {i === 0 && (
                    <span className="absolute top-1 left-1 rounded-md bg-sunset-gold text-white text-[10px] font-extrabold px-1.5 py-0.5">#১ কভার</span>
                  )}
                  {i > 0 && (
                    <button
                      type="button"
                      onClick={() => makeCover(i)}
                      aria-label="কভার ছবি করুন"
                      title="কভার ছবি করুন"
                      className="absolute top-1 left-1 w-7 h-7 rounded-md bg-black/55 text-white/85 grid place-items-center hover:bg-sunset-gold opacity-90"
                    >
                      <AIcon name="star" size={13} strokeWidth={2.2} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setMedia((prev) => prev.filter((_, j) => j !== i))}
                    aria-label="মুছে ফেলুন"
                    className="absolute top-1 right-1 w-11 h-11 grid place-items-center"
                  >
                    <span className="w-7 h-7 rounded-full bg-black/60 text-white grid place-items-center hover:bg-rose-500 transition flex">
                      <AIcon name="xmark" size={13} strokeWidth={2.4} />
                    </span>
                  </button>
              </div>
            ))}
            {/* in-flight tiles */}
            {Object.entries(uploadPct).map(([key, pct]) => (
              <div key={key} className="relative aspect-square rounded-xl border border-white/12 bg-twilight-800 grid place-items-center">
                <span className="w-9 h-9 rounded-full border-2 border-sunset-gold/25 border-t-sunset-gold animate-spin" />
                <span className="absolute bottom-1 right-1 text-[10px] font-bold text-sunset-gold tabular-nums">{toBn(pct)}%</span>
              </div>
            ))}
            {media.length === 0 && Object.keys(uploadPct).length === 0 && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="col-span-3 aspect-[3/1.4] rounded-xl border-2 border-dashed border-amber-400/35 bg-amber-400/[0.06] grid place-items-center text-center px-3 hover:border-amber-400/60 transition"
              >
                <span>
                  <span className="block text-2xl mb-1">📸</span>
                  <span className="block text-xs font-bold text-amber-300/90">রেফারেন্স ছবি নেই</span>
                  <span className="block text-[11px] text-white/45 mt-0.5">বুকিং বাড়াতে ছবি যোগ করুন — ট্যাপ করুন</span>
                </span>
              </button>
            )}
          </div>
        </div>

        {/* জনপ্রিয় toggle */}
        <button
          type="button"
          onClick={() => setPopular((v) => !v)}
          className="w-full flex items-center gap-3 rounded-xl3 border border-white/10 bg-white/[0.04] p-3.5 text-left"
        >
          <span className="w-10 h-10 rounded-xl bg-sunset-soft text-sunset-gold grid place-items-center shrink-0"><AIcon name="star" size={19} strokeWidth={2} /></span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-white">জনপ্রিয় প্যাকেজ করুন</span>
            <span className="block text-[11.5px] text-white/45 leading-tight mt-0.5">প্রোফাইলে ⭐ জনপ্রিয় ব্যাজ পাবে (একটি মাত্র প্যাকেজ জনপ্রিয় হতে পারে)</span>
          </span>
          <span className={`w-12 h-7 rounded-full relative transition shrink-0 ${popular ? 'bg-emerald-500' : 'bg-white/15'}`}>
            <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${popular ? 'left-[22px]' : 'left-0.5'}`} />
          </span>
        </button>
      </div>
    </FullDialog>
  );
}
