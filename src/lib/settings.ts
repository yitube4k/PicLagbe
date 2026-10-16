import { useEffect, useState } from 'react';
import { supabase } from './supabase';

/**
 * site_settings — admin প্যানেল থেকে নিয়ন্ত্রিত সাইট-ব্যাপী ফিচার সুইচ।
 * টেবিল না থাকলে বা নেটওয়ার্ক ফেল করলে ডিফল্ট ভ্যালু ব্যবহার হয় (সাইট কখনো ভাঙবে না)।
 */

export type SiteSettings = Record<string, string>;

export const SETTING_DEFAULTS: Record<string, string> = {
  // স্পট পেজের মিনি ম্যাপ (ডিরেকশন বারের নিচে) — 'on' | 'off' (ডিফল্ট বন্ধ)
  spot_minimap: 'off',
};

export const SETTING_LABELS: Record<string, string> = {
  spot_minimap: 'স্পট পেজের মিনি ম্যাপ (ব্লগ/লোকেশন লিঙ্ক থেকে খোলা পেজে ডিরেকশনের নিচে যে ম্যাপ দেখা যায়)',
};

// ছোট module-level cache — এক পেজে একাধিক কম্পোনেন্ট একই কোয়েরি না চালায়
let cache: SiteSettings | null = null;
let inflight: Promise<SiteSettings> | null = null;
// V19: subscribers — saveSiteSetting কল হলে সব হুক সাথে সাথে আপডেট হয় (refresh ছাড়াই)
const listeners = new Set<(s: SiteSettings) => void>();

function notify() {
  if (!cache) return;
  listeners.forEach((cb) => cb(cache!));
}

export async function fetchSiteSettings(): Promise<SiteSettings> {
  if (cache) return cache;
  if (!inflight) {
    inflight = (async () => {
      try {
        const { data, error } = await supabase.from('site_settings').select('key, value');
        const merged: SiteSettings = { ...SETTING_DEFAULTS };
        if (!error && data) {
          (data as { key: string; value: string }[]).forEach((r) => {
            if (r?.key) merged[r.key] = r.value ?? '';
          });
        }
        cache = merged;
        return merged;
      } catch {
        return { ...SETTING_DEFAULTS };
      } finally {
        inflight = null;
      }
    })();
  }
  return inflight;
}

/** এক/একাধিক সেটিং পড়ার হুক — টেবিল/নেটওয়ার্ক ফেল হলে ডিফল্ট; সেভ হলে লাইভ আপডেট */
export function useSiteSettings(): { settings: SiteSettings; ready: boolean } {
  const [settings, setSettings] = useState<SiteSettings>({ ...SETTING_DEFAULTS });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    fetchSiteSettings().then((s) => {
      if (active) {
        setSettings(s);
        setReady(true);
      }
    });
    const cb = (s: SiteSettings) => setSettings({ ...s });
    listeners.add(cb);
    return () => {
      active = false;
      listeners.delete(cb);
    };
  }, []);

  return { settings, ready };
}

export function isOn(value: string | undefined, def: string): boolean {
  const v = value ?? def;
  return v === 'on';
}

/** admin সেটিং সেভ (upsert) — কলার audit logAction করবে */
export async function saveSiteSetting(key: string, value: string): Promise<boolean> {
  const { error } = await supabase
    .from('site_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (!error) {
    cache = { ...(cache || { ...SETTING_DEFAULTS }), [key]: value };
    notify(); // V19: সব খোলা হুক সাথে সাথে আপডেট — refresh লাগে না
  }
  return !error;
}
