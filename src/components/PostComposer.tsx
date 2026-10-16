import React, { useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Post, PostMedia } from '../lib/types';
import { uploadToCloudinary, cldConfigured, cldUrl } from '../lib/cloudinary';

interface PostComposerProps {
  photographerId: string;
  /** এডিট মোডে আগের পোস্ট */
  editing?: Post | null;
  onDone: (saved: 'created' | 'updated') => void;
  onCancel: () => void;
}

/**
 * ফটোগ্রাফারের কাজের পোস্ট তৈরি/এডিট —
 * কাজের বিবরণ (টাইটেল + ডিটেইলস), দাম, ছবি/ভিডিও (Cloudinary)।
 * সেভ করলে status = pending → অ্যাডমিন অনুমোদনের পর প্রোফাইলে দেখা যাবে।
 */
export default function PostComposer({ photographerId, editing, onDone, onCancel }: PostComposerProps) {
  const [title, setTitle] = useState(editing?.title || '');
  const [body, setBody] = useState(editing?.body || '');
  const [price, setPrice] = useState(editing?.price != null ? String(editing.price) : '');
  const [media, setMedia] = useState<PostMedia[]>(editing?.media || []);

  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const acceptAttr = 'image/*,video/*';

  const uploadFiles = async (files: FileList | File[]) => {
    setErr(null);
    setUploading(true);
    setUploadPct(0);
    const list = Array.from(files);
    let done = 0;
    try {
      for (const f of list) {
        const res = await uploadToCloudinary(f, 'piclagbe/posts');
        setMedia((prev) => [...prev, { url: res.url, type: res.resourceType }]);
        done += 1;
        setUploadPct(Math.round((done / list.length) * 100));
      }
    } catch (e) {
      setErr((e as Error).message || 'আপলোড ব্যর্থ');
    } finally {
      setUploading(false);
    }
  };

  const addUrlManually = () => {
    const url = window.prompt('ছবি/ভিডিওর লিংক পেস্ট করুন (https://…)');
    if (!url) return;
    const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(url) || /\/video\/upload\//.test(url);
    setMedia((prev) => [...prev, { url: url.trim(), type: isVideo ? 'video' : 'image' }]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (!title.trim()) { setErr('কাজের শিরোনাম দিন'); return; }
    if (media.length === 0) { setErr('অন্তত একটি ছবি বা ভিডিও যোগ করুন'); return; }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        body: body.trim() || null,
        price: price ? Number(price) : null,
        media,
        updated_at: new Date().toISOString(),
      };

      let error;
      if (editing) {
        ({ error } = await supabase.from('posts').update(payload).eq('id', editing.id));
      } else {
        ({ error } = await supabase
          .from('posts')
          .insert({ photographer_id: photographerId, ...payload, status: 'pending' }));
      }
      if (error) throw error;
      onDone(editing ? 'updated' : 'created');
    } catch (e2) {
      setErr((e2 as Error).message || 'সেভ ব্যর্থ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="glass-card rounded-xl3 p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-white text-lg">
          {editing ? 'পোস্ট এডিট করুন' : 'নতুন কাজের পোস্ট'}
        </h3>
        <button type="button" onClick={onCancel} className="text-white/50 hover:text-white text-sm" aria-label="বন্ধ করুন">
          ✕
        </button>
      </div>

      {!editing && (
        <p className="rounded-lg bg-amber-400/10 border border-amber-400/20 px-3 py-2 text-[13.5px] text-amber-300/90 leading-relaxed">
          পোস্টটি প্রথমে অ্যাডমিন রিভিউতে যাবে (⏳ রিভিউতে আছে)। অনুমোদনের পর আপনার প্রোফাইলে সবাই দেখতে পাবে।
        </p>
      )}

      {/* শিরোনাম */}
      <div>
        <label className="field-label" htmlFor="pc-title">কাজের শিরোনাম *</label>
        <input
          id="pc-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="যেমন: সূর্যাস্ত প্রি-ওয়েডিং প্যাকেজ — লাবণী পয়েন্ট"
          className="glass-input"
        />
      </div>

      {/* বিবরণ */}
      <div>
        <label className="field-label" htmlFor="pc-body">কাজের বিবরণ</label>
        <textarea
          id="pc-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={1500}
          placeholder="প্যাকেজে কী কী থাকছে, কতক্ষণ শুট, কয়টি এডিটেড ছবি, ডেলিভারি সময় ইত্যাদি লিখুন…"
          className="glass-input resize-y"
        />
      </div>

      {/* দাম */}
      <div>
        <label className="field-label" htmlFor="pc-price">দাম (৳) — খালি রাখলে দেখানো হবে না</label>
        <input
          id="pc-price"
          type="number"
          min={0}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="যেমন: 4000"
          className="glass-input"
        />
      </div>

      {/* মিডিয়া */}
      <div>
        <label className="field-label">ছবি / ভিডিও * (Cloudinary — সর্বোচ্চ ১০টি)</label>

        {media.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
            {media.map((m, i) => {
              const isVideo = m.type === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(m.url);
              return (
                <div key={`${m.url}-${i}`} className="relative rounded-lg overflow-hidden border border-white/10 bg-black/30 h-20">
                  {isVideo ? (
                    <video src={m.url} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                  ) : (
                    <img src={cldUrl(m.url, { w: 160, h: 120, c: 'fill' })} alt="" className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    aria-label="মুছে ফেলুন"
                    onClick={() => setMedia((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white text-[11.5px] flex items-center justify-center hover:bg-rose-600"
                  >
                    ✕
                  </button>
                  {isVideo && (
                    <span className="absolute bottom-1 left-1 text-[10.5px] bg-black/70 rounded px-1 text-white">ভিডিও</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept={acceptAttr}
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) uploadFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || media.length >= 10}
            className="btn-ghost text-xs !px-4"
          >
            {uploading ? `⬆ আপলোড হচ্ছে… ${uploadPct > 0 ? uploadPct + '%' : ''}` : '⬆ ফাইল বাছুন'}
          </button>
          <button type="button" onClick={addUrlManually} disabled={media.length >= 10} className="btn-ghost text-xs !px-4">
            🔗 লিংক যোগ
          </button>
        </div>

        {!cldConfigured() && (
          <p className="text-[12.5px] text-amber-400/80 mt-1.5">Cloudinary কনফিগার না থাকলে "লিংক যোগ" দিয়ে URL পেস্ট করুন।</p>
        )}
      </div>

      {err && <p className="text-xs text-rose-400">{err}</p>}

      <div className="flex items-center gap-3 pt-1">
        <button type="submit" disabled={saving} className="btn-primary flex-1 sm:flex-none sm:px-8">
          {saving ? 'সেভ হচ্ছে…' : editing ? 'আপডেট করুন' : 'রিভিউয়ের জন্য পাঠান'}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">
          বাতিল
        </button>
      </div>
    </form>
  );
}
