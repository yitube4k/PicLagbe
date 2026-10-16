import React, { useState } from 'react';
import { useSiteSettings, saveSiteSetting, SETTING_LABELS, isOn } from '../../lib/settings';
import { logAction } from '../../lib/audit';
import { useSnack } from './kit';
import { AIcon, type IconName } from '../../admin/icons';

/** ⚙️ সাইট সেটিংস — Android settings-list স্টাইল; টগল লাইভ আপডেট হয় (refresh লাগে না) */
export default function AdminSettings() {
  const { settings, ready } = useSiteSettings();
  const [saving, setSaving] = useState<string | null>(null);
  const { show } = useSnack();

  const toggle = async (key: string) => {
    const next = isOn(settings[key], 'off') ? 'off' : 'on';
    setSaving(key);
    const ok = await saveSiteSetting(key, next);
    setSaving(null);
    if (ok) {
      logAction('update', 'system', key, `সাইট সেটিং: ${SETTING_LABELS[key] || key}`, {
        after: { value: next },
      });
      show(next === 'on' ? `${SETTING_LABELS[key]?.slice(0, 18) || key}… চালু হয়েছে` : 'ফিচারটি লুকানো হয়েছে', { tone: next === 'on' ? 'success' : 'info' });
    } else {
      show('সেভ করা যায়নি — site_settings টেবিল/পলিসি চেক করুন', { tone: 'error' });
    }
  };

  const items: { key: string; icon: IconName; title: string }[] = [
    { key: 'spot_minimap', icon: 'audit', title: 'স্পট পেজের মিনি ম্যাপ' },
  ];

  return (
    <div className="space-y-4">
      <div className="glass rounded-xl3 p-4 sm:p-5 flex items-start gap-3.5">
        <span className="w-11 h-11 rounded-xl2 bg-sunset-soft border border-sunset-gold/25 grid place-items-center text-sunset-gold shrink-0">
          <AIcon name="tune" size={21} strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <h3 className="font-extrabold text-white text-[15.5px]">ফিচার নিয়ন্ত্রণ</h3>
          <p className="text-[13px] text-white/55 mt-1 leading-relaxed">
            সাইটের ফিচার এখান থেকে সাথে সাথে চালু/বন্ধ হয় — সব ভিজিটরের কাছে সাথে সাথে প্রযোজ্য হয়। প্রতিটি বদল অডিট লগে সেভ হয়।
          </p>
        </div>
      </div>

      {!ready ? (
        <div className="space-y-2.5">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-xl2" />
          ))}
        </div>
      ) : (
        <div className="glass rounded-xl3 divide-y divide-white/[0.07] overflow-hidden">
          {items.map(({ key, icon, title }) => {
            const on = isOn(settings[key], 'off');
            return (
              <div key={key} className="p-4 sm:p-5 flex items-center gap-3.5">
                <span className="w-11 h-11 rounded-xl2 bg-white/[0.05] border border-white/10 grid place-items-center text-white/70 shrink-0">
                  <AIcon name={icon} size={20} strokeWidth={1.9} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white text-[15px]">{title}</span>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold whitespace-nowrap ${saving === key ? 'admin-busy' : ''} ${
                      on
                        ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                        : 'border-white/15 bg-white/[0.05] text-white/50'
                    }`}>
                      {on ? 'চালু আছে' : 'লুকানো'}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-white/50 mt-1 leading-relaxed">{SETTING_LABELS[key]}</p>
                </div>

                {/* M3 switch — 48px touch target */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={`${title} চালু/বন্ধ`}
                  disabled={saving === key}
                  onClick={() => toggle(key)}
                  className={`relative shrink-0 w-[54px] h-[32px] rounded-full transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-sunset-gold/50 disabled:opacity-60 ${
                    on ? 'bg-sunset-gradient' : 'bg-white/[0.14]'
                  }`}
                >
                  <span
                    className={`absolute top-[4px] w-6 h-6 rounded-full bg-white shadow-md transition-all duration-200 ${
                      on ? 'left-[26px]' : 'left-[4px]'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
