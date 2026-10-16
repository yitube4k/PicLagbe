import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import CldUploadField from '../components/CldUploadField';
import { bnDate } from '../lib/utils';

/* ═══════════════════ ১) প্রোফাইল এডিট — নাম, ফোন, WhatsApp, অ্যাভাটার, বায়ো ═══════════════════ */
export function ProfileEditSection() {
  const { profile, refresh } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setName(profile.full_name || '');
    setPhone(profile.phone || '');
    setWhatsapp(profile.whatsapp || '');
    setBio(profile.bio || '');
    setAvatar(profile.avatar_url || '');
  }, [profile]);

  if (!profile) return null;

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setErr(null);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: name.trim() || null,
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatar.trim() || null,
      })
      .eq('id', profile.id);

    setSaving(false);
    if (error) {
      setErr('সেভ করা যায়নি — আবার চেষ্টা করুন।');
      console.error('Profile save error:', error);
    } else {
      setSaved(true);
      await refresh();
      setTimeout(() => setSaved(false), 3500);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="glass-card rounded-xl3 p-6 space-y-5">
        <div className="flex items-center gap-4">
          {avatar ? (
            <img src={avatar} alt={name || 'অ্যাভাটার'} className="w-16 h-16 rounded-2xl object-cover ring-2 ring-sunset-gold/45" />
          ) : (
            <div className="w-16 h-16 rounded-2xl ring-2 ring-sunset-gold/45 bg-sunset-gradient flex items-center justify-center text-xl font-bold text-[#1A0E06]">
              {(name || 'ফ').slice(0, 1)}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-bold text-white text-base">আপনার প্রোফাইল</h3>
            <p className="text-xs text-white/50 truncate">📧 {profile.email}</p>
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="pf-avatar">প্রোফাইল ছবি</label>
          <CldUploadField label="অ্যাভাটার (URL বা আপলোড)" value={avatar} onChange={setAvatar} folder="piclagbe/avatars" placeholder="https://… (ছবির লিঙ্ক)" />
        </div>

        <div>
          <label className="field-label" htmlFor="pf-name">পুরো নাম</label>
          <input id="pf-name" className="glass-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="আপনার নাম" />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label" htmlFor="pf-phone">ফোন নম্বর</label>
            <input id="pf-phone" className="glass-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" inputMode="tel" />
          </div>
          <div>
            <label className="field-label" htmlFor="pf-wa">WhatsApp নম্বর</label>
            <input id="pf-wa" className="glass-input" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="01XXXXXXXXX (আলাদা হলে)" inputMode="tel" />
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="pf-bio">নিজের সম্পর্কে (বায়ো)</label>
          <textarea id="pf-bio" rows={3} className="glass-input resize-none" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="২–৩ লাইনে নিজেকে পরিচয় করিয়ে দিন…" />
        </div>

        {err && <p className="text-xs text-red-400">{err}</p>}
        {saved && <p className="text-xs text-emerald-400">✅ প্রোফাইল সেভ হয়েছে</p>}

        <button type="button" onClick={handleSave} disabled={saving} className="btn-primary w-full sm:w-auto justify-center">
          {saving ? 'সেভ হচ্ছে…' : 'প্রোফাইল সেভ করুন'}
        </button>
      </div>

      <p className="text-[12.5px] text-white/40 text-center">
        ফোন ও WhatsApp নম্বর শুধু আপনার ডিল করা ফটোগ্রাফার/গ্রাহককে দেখানো হয়।
      </p>
    </div>
  );
}

/* ═══════════════════ ২) ফটোগ্রাফার মাইগ্রেশন — user → photographer আবেদন ═══════════════════ */
type RoleRequest = {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  review_note: string | null;
  created_at: string;
};

export function MigrationSection() {
  const { profile } = useAuth();
  const [request, setRequest] = useState<RoleRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [city, setCity] = useState('');
  const [exp, setExp] = useState('');
  const [equipment, setEquipment] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!profile) return;
    let active = true;

    async function load() {
      setDisplayName(profile?.full_name || '');
      setPhone(profile?.phone || '');
      setWhatsapp(profile?.whatsapp || '');
      const { data } = await supabase
        .from('role_requests')
        .select('id, status, review_note, created_at')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (!active) return;
      const r = (data as RoleRequest[] | null)?.[0] || null;
      setRequest(r);
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [profile]);

  if (!profile || loading) return null;

  const handleSubmit = async () => {
    if (!displayName.trim()) {
      setSubmitErr('নাম দিন — এটি আপনার পাবলিক প্রোফাইলের নাম হবে।');
      return;
    }
    setSubmitting(true);
    setSubmitErr(null);

    const { error } = await supabase.from('role_requests').insert({
      user_id: profile.id,
      display_name: displayName.trim(),
      phone: phone.trim() || null,
      whatsapp: whatsapp.trim() || null,
      city: city.trim() || null,
      experience_years: Number(exp) || 0,
      equipment: equipment.trim() || null,
      portfolio_url: portfolioUrl.trim() || null,
      note: note.trim() || null,
      status: 'pending',
    });

    setSubmitting(false);
    if (error) {
      setSubmitErr('আবেদন পাঠানো যায়নি — আবার চেষ্টা করুন।');
      console.error('Role request error:', error);
    } else {
      setDone(true);
      setRequest({ id: '-', status: 'pending', review_note: null, created_at: new Date().toISOString() });
    }
  };

  /* স্ট্যাটাস কার্ড */
  if (request && !showForm) {
    const isPending = request.status === 'pending';
    const isRejected = request.status === 'rejected';
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className={`glass-card rounded-xl3 p-6 space-y-3 ${isPending ? 'border-sunset-gold/40' : isRejected ? 'border-red-400/40' : 'border-emerald-400/40'}`}>
          <h3 className="font-bold text-white text-base">
            {isPending && '⏳ ফটোগ্রাফার আবেদন প্রক্রিয়াধীন'}
            {isRejected && '❌ আবেদন প্রত্যাখ্যাত হয়েছে'}
            {request.status === 'approved' && '✅ আবেদন অনুমোদিত'}
          </h3>
          <p className="text-sm text-white/65 leading-relaxed">
            {isPending && 'আপনার আবেদন অ্যাডমিন রিভিউ করছেন। অনুমোদিত হলে নোটিফিকেশন পাবেন এবং স্টুডিও ড্যাশবোর্ড খুলে যাবে।'}
            {isRejected && `অ্যাডমিনের মন্তব্য: ${request.review_note || '—'} নিচের বাটনে ক্লিক করে আবার আবেদন করতে পারেন।`}
            {request.status === 'approved' && 'আপনার ফটোগ্রাফার অ্যাকাউন্ট তৈরি হয়ে গেছে। স্টুডিও ড্যাশবোর্ডে যান।'}
          </p>
          <p className="text-[12.5px] text-white/40">আবেদন: {bnDate(request.created_at)}</p>

          {isRejected && (
            <button type="button" onClick={() => setShowForm(true)} className="btn-primary !py-2 !px-5 !text-sm">
              আবার আবেদন করুন
            </button>
          )}
          {request.status === 'approved' && (
            <Link to="/studio" className="btn-primary !py-2 !px-5 !text-sm inline-block">
              মাই স্টুডিও →
            </Link>
          )}
        </div>
        <HelpCard />
      </div>
    );
  }

  if (done) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="glass-card rounded-xl3 p-8 text-center border-sunset-gold/40">
          <p className="text-3xl mb-3" aria-hidden="true">🎉</p>
          <h3 className="font-bold text-white text-lg">আবেদন পাঠানো হয়েছে!</h3>
          <p className="text-sm text-white/60 mt-2 leading-relaxed">
            অ্যাডমিন রিভিউ করার পর নোটিফিকেশন পাবেন। অনুমোদিত হলে আপনার ফটোগ্রাফার প্রোফাইল অটো-তৈরি হবে।
          </p>
        </div>
      </div>
    );
  }

  /* ফর্ম */
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="glass-card rounded-xl3 p-6 space-y-4">
        <div>
          <h3 className="font-bold text-white text-base">🎬 ফটোগ্রাফার হিসেবে যুক্ত হোন</h3>
          <p className="text-xs text-white/55 mt-1 leading-relaxed">
            ফর্মটি পূরণ করুন — অ্যাডমিন অনুমোদনের পর আপনার পাবলিক ফটোগ্রাফার প্রোফাইল অটো-তৈরি হবে (সার্চ ও ম্যাপে দেখা যাবে)।
          </p>
        </div>

        <div>
          <label className="field-label" htmlFor="mg-name">প্রোফাইল নাম (পাবলিক)</label>
          <input id="mg-name" className="glass-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="যেমন: রফিক ফটোগ্রাফি" />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label" htmlFor="mg-phone">ফোন নম্বর</label>
            <input id="mg-phone" className="glass-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" inputMode="tel" />
          </div>
          <div>
            <label className="field-label" htmlFor="mg-wa">WhatsApp নম্বর</label>
            <input id="mg-wa" className="glass-input" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="01XXXXXXXXX" inputMode="tel" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label" htmlFor="mg-city">কাজের এলাকা / শহর</label>
            <input id="mg-city" className="glass-input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="যেমন: কক্সবাজার সদর" />
          </div>
          <div>
            <label className="field-label" htmlFor="mg-exp">অভিজ্ঞতা (বছর)</label>
            <input id="mg-exp" className="glass-input" value={exp} onChange={(e) => setExp(e.target.value.replace(/\D/g, ''))} placeholder="যেমন: 3" inputMode="numeric" />
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="mg-eq">যন্ত্রপাতি (ক্যামেরা/লেন্স)</label>
          <input id="mg-eq" className="glass-input" value={equipment} onChange={(e) => setEquipment(e.target.value)} placeholder="যেমন: Canon R6, 24-70mm f/2.8, DJI Air 3" />
        </div>

        <div>
          <label className="field-label" htmlFor="mg-port">পোর্টফোলিও লিঙ্ক (Facebook/Instagram/Drive)</label>
          <input id="mg-port" className="glass-input" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="https://…" inputMode="url" />
        </div>

        <div>
          <label className="field-label" htmlFor="mg-note">অ্যাডমিনের জন্য নোট</label>
          <textarea id="mg-note" rows={3} className="glass-input resize-none" value={note} onChange={(e) => setNote(e.target.value)} placeholder="আপনার অভিজ্ঞতা, বিশেষত্ব বা যেকোনো তথ্য…" />
        </div>

        {submitErr && <p className="text-xs text-red-400">{submitErr}</p>}

        <div className="flex gap-3">
          {request && request.status === 'rejected' && (
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">
              ফিরে যান
            </button>
          )}
          <button type="button" onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1 justify-center">
            {submitting ? 'পাঠানো হচ্ছে…' : 'আবেদন জমা দিন'}
          </button>
        </div>
      </div>
      <HelpCard />
    </div>
  );
}

function HelpCard() {
  return (
    <div className="glass rounded-xl3 p-4">
      <p className="text-[13.5px] text-white/60 leading-relaxed">
        💡 <b className="text-white/80">প্রক্রিয়া:</b> আবেদন → অ্যাডমিন রিভিউ → অনুমোদন → স্টুডিও ড্যাশবোর্ড আনলক →
        প্যাকেজ/পোর্টফোলিও যোগ করুন → KYC ভেরিফিকেশনে <b className="text-sunset-gold">✔ ভেরিফায়েড ব্যাজ</b> নিন।
      </p>
    </div>
  );
}

/* ═══════════════════ ৩) KYC ভেরিফিকেশন — ফটোগ্রাফার রোলের জন্য প্রোফাইল সেকশন থেকেই ═══════════════════ */
type KycRow = {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  nid_front_url: string;
  nid_back_url: string | null;
  selfie_url: string;
  phone: string;
  note: string | null;
  review_note: string | null;
  created_at: string;
};

export function KycSection() {
  const { session } = useAuth();
  const [phId, setPhId] = useState<string | null>(null);
  const [kyc, setKyc] = useState<KycRow | null>(null);
  const [loading, setLoading] = useState(true);

  const [nidFront, setNidFront] = useState('');
  const [nidBack, setNidBack] = useState('');
  const [selfie, setSelfie] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!session?.user) return;
    let active = true;

    (async () => {
      const { data: ph } = await supabase
        .from('photographers')
        .select('id, phone')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!active) return;
      if (ph) {
        setPhId((ph as { id: string }).id);
        setPhone((ph as { phone: string | null }).phone || '');
        const { data: k } = await supabase
          .from('kyc_submissions')
          .select('*')
          .eq('photographer_id', (ph as { id: string }).id)
          .maybeSingle();
        if (!active) return;
        if (k) {
          const row = k as KycRow;
          setKyc(row);
          setNidFront(row.nid_front_url || '');
          setNidBack(row.nid_back_url || '');
          setSelfie(row.selfie_url || '');
          setPhone(row.phone || '');
          setNote(row.note || '');
        }
      }
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [session]);

  if (loading) {
    return <div className="skeleton h-48 rounded-xl3 max-w-2xl mx-auto" />;
  }

  if (!phId) {
    return (
      <div className="glass-card rounded-xl3 p-8 text-center max-w-2xl mx-auto">
        <p className="text-sm text-white/65 leading-relaxed">
          KYC শুধু ফটোগ্রাফার অ্যাকাউন্টের জন্য। আপনার ফটোগ্রাফার প্রোফাইল তৈরি হয়নি এখনো।
        </p>
      </div>
    );
  }

  const isApproved = kyc?.status === 'approved';
  const canSubmit = !kyc || kyc.status === 'rejected' || kyc.status === 'pending';

  const handleSubmit = async () => {
    if (!nidFront.trim() || !selfie.trim()) {
      setMsg({ ok: false, text: 'NID-এর সামনের পাশ ও সেলফি — দুটোই দরকার।' });
      return;
    }
    setSaving(true);
    setMsg(null);

    const payload = {
      photographer_id: phId,
      nid_front_url: nidFront.trim(),
      nid_back_url: nidBack.trim() || null,
      selfie_url: selfie.trim(),
      phone: phone.trim(),
      note: note.trim() || null,
      status: 'pending' as const,
    };

    const { error } = kyc
      ? await supabase.from('kyc_submissions').update(payload).eq('id', kyc.id)
      : await supabase.from('kyc_submissions').insert(payload);

    setSaving(false);
    if (error) {
      setMsg({ ok: false, text: 'জমা দেওয়া যায়নি — আবার চেষ্টা করুন।' });
      console.error('KYC submit error:', error);
    } else {
      setMsg({ ok: true, text: '✅ জমা হয়েছে — অ্যাডমিন রিভিউয়ের অপেক্ষায়।' });
      const { data: k } = await supabase.from('kyc_submissions').select('*').eq('photographer_id', phId).maybeSingle();
      if (k) setKyc(k as KycRow);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* স্ট্যাটাস */}
      {kyc && (
        <div className={`glass-card rounded-xl3 p-5 ${kyc.status === 'approved' ? 'border-emerald-400/40' : kyc.status === 'rejected' ? 'border-red-400/40' : 'border-sunset-gold/40'}`}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold text-white text-sm">
              {kyc.status === 'approved' && '✅ ভেরিফায়েড — আপনার ব্যাজ লাইভ'}
              {kyc.status === 'pending' && '⏳ রিভিউয়ের অপেক্ষায়'}
              {kyc.status === 'rejected' && '❌ প্রত্যাখ্যাত — ঠিক করে আবার জমা দিন'}
            </h3>
            <span className="text-[12.5px] text-white/40">{bnDate(kyc.created_at)}</span>
          </div>
          {kyc.review_note && (
            <p className="text-xs text-white/60 mt-2">অ্যাডমিনের মন্তব্য: {kyc.review_note}</p>
          )}
        </div>
      )}

      {isApproved ? (
        <div className="glass-card rounded-xl3 p-8 text-center">
          <p className="text-3xl mb-2" aria-hidden="true">🏅</p>
          <p className="text-sm text-white/65">আপনার প্রোফাইলে ভেরিফায়েড ব্যাজ দেখানো হচ্ছে। ধন্যবাদ!</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl3 p-6 space-y-4">
          <div>
            <h3 className="font-bold text-white text-base">🛡️ KYC ভেরিফিকেশন</h3>
            <p className="text-xs text-white/55 mt-1 leading-relaxed">
              NID + সেলফি জমা দিয়ে <b className="text-sunset-gold">✔ ভেরিফায়েড</b> ব্যাজ নিন — গ্রাহকের আস্থা বাড়ে, বুকিংও বাড়ে।
            </p>
          </div>

          <CldUploadField label="NID — সামনের পাশ *" value={nidFront} onChange={setNidFront} folder="piclagbe/kyc" placeholder="https://…" />
          <CldUploadField label="NID — পেছনের পাশ" value={nidBack} onChange={setNidBack} folder="piclagbe/kyc" placeholder="https://…" />
          <CldUploadField label="সেলফি (NID হাতে ধরে) *" value={selfie} onChange={setSelfie} folder="piclagbe/kyc" placeholder="https://…" />

          <div>
            <label className="field-label" htmlFor="kyc-phone">যোগাযোগের নম্বর</label>
            <input id="kyc-phone" className="glass-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" inputMode="tel" />
          </div>

          <div>
            <label className="field-label" htmlFor="kyc-note">নোট (ঐচ্ছিক)</label>
            <textarea id="kyc-note" rows={2} className="glass-input resize-none" value={note} onChange={(e) => setNote(e.target.value)} placeholder="যা জানাতে চান…" />
          </div>

          {msg && <p className={`text-xs ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p>}

          {canSubmit ? (
            <button type="button" onClick={handleSubmit} disabled={saving} className="btn-primary w-full justify-center">
              {saving ? 'জমা হচ্ছে…' : kyc ? 'আবার জমা দিন' : 'KYC জমা দিন'}
            </button>
          ) : (
            <p className="text-xs text-white/50">অনুমোদিত KYC আর পরিবর্তন করা যায় না।</p>
          )}
        </div>
      )}
    </div>
  );
}
