import React, { useState } from 'react';
import { useSiteSettings, saveSiteSetting, SETTING_LABELS, isOn } from '../../lib/settings';
import { logAction } from '../../lib/audit';

/** ⚙️ সাইট সেটিংস — admin নিয়ন্ত্রিত ফিচার enable/hide সুইচ */
export default function AdminSettings() {
  const { settings, ready } = useSiteSettings();
  const [saving, setSaving] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const toggle = async (key: string) => {
    const next = isOn(settings[key], 'off') ? 'off' : 'on';
    setSaving(key);
    const ok = await saveSiteSetting(key, next);
    setSaving(null);
    if (ok) {
      logAction('update', 'system', key, `সাইট সেটিং: ${SETTING_LABELS[key] || key}`, {
        after: { value: next },
      });
      setFlash(next === 'on' ? '✅ চালু হয়েছে' : '🚫 বন্ধ হয়েছে');
    } else {
      setFlash('⚠️ সেভ করা যায়নি — site_settings টেবিল/পলিসি চেক করুন');
    }
    setTimeout(() => setFlash(null), 3500);
  };

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-xl3 p-5">
        <h3 className="font-bold text-white">⚙️ সাইট সেটিংস</h3>
        <p className="text-sm text-white/55 mt-1 leading-relaxed">
          সাইটের ফিচার এখন থেকে এখান থেকে চালু/বন্ধ করা যাবে। বদলানো প্রতিটি সেটিং অডিট লগে সেভ হয়।
        </p>
      </div>

      {!ready ? (
        <div className="glass rounded-xl3 p-6 text-white/60 text-sm">লোড হচ্ছে…</div>
      ) : (
        <div className="glass rounded-xl3 divide-y divide-white/[0.07]">
          {/* প্রতিটি টগল আইটেম */}
          {(['spot_minimap'] as const).map((key) => {
            const on = isOn(settings[key], 'off');
            return (
              <div key={key} className="p-5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-semibold text-white text-[16.5px]">
                    🗺️ স্পট পেজের মিনি ম্যাপ{' '}
                    <span
                      className={`badge ml-1 ${
                        on
                          ? 'bg-emerald-400/15 text-emerald-300 border-emerald-300/30'
                          : 'bg-white/[0.06] text-white/50 border-white/10'
                      }`}
                    >
                      {on ? 'চালু আছে' : 'লুকানো'}
                    </span>
                  </div>
                  <p className="text-[14.5px] text-white/50 mt-1.5 leading-relaxed">
                    {SETTING_LABELS[key]} — ডিফল্টে বন্ধ (ব্লগ পড়ার সময় ম্যাপে চোখ না যায়)। চাইলে যেকোনো সময় চালু করুন।
                  </p>
                </div>

                {/* iOS-style switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label="স্পট মিনি ম্যাপ চালু/বন্ধ"
                  disabled={saving === key}
                  onClick={() => toggle(key)}
                  className={`relative shrink-0 w-[54px] h-[30px] rounded-full transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-sunset-gold/50 ${
                    on ? 'bg-sunset-gradient' : 'bg-white/[0.12]'
                  }`}
                >
                  <span
                    className={`absolute top-[3px] w-6 h-6 rounded-full bg-white shadow transition-all duration-200 ${
                      on ? 'left-[27px]' : 'left-[3px]'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {flash && (
        <p className={`text-sm font-semibold ${flash.startsWith('⚠️') ? 'text-amber-300' : 'text-emerald-300'}`}>
          {flash}
        </p>
      )}
    </div>
  );
}
