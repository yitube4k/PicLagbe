import React, { useRef, useState } from 'react';
import { uploadToCloudinary, cldConfigured, cldUrl } from '../lib/cloudinary';

interface CldUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  /** Which uploads to allow */
  accept?: 'image' | 'video' | 'both';
  folder?: string;
  required?: boolean;
  placeholder?: string;
  /** Called after successful upload with the resource type actually uploaded */
  onUploaded?: (resourceType: 'image' | 'video') => void;
  /** Show a small preview thumbnail (images only) */
  preview?: boolean;
}

/**
 * URL input + Cloudinary file-upload button (unsigned direct upload, f_auto webp delivery).
 * Falls back to plain URL paste when Cloudinary env is not configured.
 */
export default function CldUploadField({
  label,
  value,
  onChange,
  accept = 'image',
  folder = 'piclagbe',
  required = false,
  placeholder = 'https://…',
  onUploaded,
  preview = true,
}: CldUploadFieldProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  const acceptAttr =
    accept === 'image' ? 'image/*' : accept === 'video' ? 'video/*' : 'image/*,video/*';

  const configured = cldConfigured();

  const handleFile = (file: File, withFolder = true) => {
    setErr(null);
    setUploading(true);
    setPct(0);

    const fd = new FormData();
    const isVideo = file.type.startsWith('video/');
    const cloud = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string) || '';
    const preset = (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string) || '';
    fd.append('file', file);
    fd.append('upload_preset', preset);
    if (withFolder) fd.append('folder', folder);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloud}/${isVideo ? 'video' : 'image'}/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setPct(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && json.secure_url) {
          setUploading(false);
          onChange(json.secure_url as string);
          onUploaded?.(isVideo ? 'video' : 'image');
        } else {
          const msg: string = json?.error?.message || `আপলোড ব্যর্থ (${xhr.status})`;
          if (/folder/i.test(msg) && withFolder) {
            handleFile(file, false);
            return;
          }
          setUploading(false);
          setErr(msg);
        }
      } catch {
        setUploading(false);
        setErr('আপলোড রেসপন্স পড়া যায়নি');
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      setErr('নেটওয়ার্ক সমস্যা — আবার চেষ্টা করুন');
    };

    xhr.send(fd);
  };

  return (
    <div>
      <label className="field-label">{label}</label>
      <div className="flex gap-2">
        <input
          type="url"
          value={value}
          required={required}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="glass-input flex-1"
        />
        <input
          ref={fileRef}
          type="file"
          accept={acceptAttr}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="btn-ghost shrink-0 !px-4 text-xs whitespace-nowrap"
          title={configured ? 'Cloudinary-তে আপলোড করুন' : 'Cloudinary কনফিগার করা হয়নি (.env)'}
        >
          {uploading ? `${pct > 0 ? pct + '% — ' : ''}আপলোড হচ্ছে…` : '⬆ ফাইল আপলোড'}
        </button>
      </div>

      {preview && value && (accept === 'image' || accept === 'both') && !value.match(/\.(mp4|webm|mov)(\?|$)/) && (
        <img
          src={cldUrl(value, { w: 200, h: 120, c: 'fill' })}
          alt="প্রিভিউ"
          className="mt-2 h-20 w-32 object-cover rounded-lg border border-white/15"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      )}

      {err && <p className="text-xs text-rose-400 mt-1.5">{err}</p>}
      {!configured && (
        <p className="text-[12.5px] text-amber-400/80 mt-1.5 leading-relaxed">
          ফাইল আপলোডের জন্য Cloudinary সেটআপ লাগবে (.env-এ VITE_CLOUDINARY_CLOUD_NAME ও VITE_CLOUDINARY_UPLOAD_PRESET) — না থাকলে লিংক পেস্ট করুন।
        </p>
      )}
    </div>
  );
}
