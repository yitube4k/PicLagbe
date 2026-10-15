// PhotoLagbe V9 — Cox's Bazar ONLY (the world's longest sea beach)
export type Spot = {
  key: string
  nameBn: string
  nameEn: string
  lat: number
  lng: number
  kind: 'beach' | 'point' | 'island' | 'landmark' | 'park' | 'drive'
  descBn: string
}

export const COX_SPOTS: Spot[] = [
  { key: 'laboni', nameBn: 'লাবণী পয়েন্ট', nameEn: 'Laboni Beach', lat: 21.4268, lng: 92.0062, kind: 'beach', descBn: 'কক্সবাজারের প্রবেশদ্বার — সূর্যাস্ত ও ওয়েডিং শুটের সবচেয়ে জনপ্রিয় পয়েন্ট' },
  { key: 'sugandha', nameBn: 'সুগন্ধা পয়েন্ট', nameEn: 'Sugandha Point', lat: 21.4315, lng: 92.0048, kind: 'point', descBn: 'বিকেলের আলোয় লাইফগার্ড পোস্ট আর লন্ডনি রাইড — ফ্যামিলি শুটের জন্য সেরা' },
  { key: 'kolatoli', nameBn: 'কলাতলী সমুদ্র সৈকত', nameEn: 'Kolatoli Beach', lat: 21.4186, lng: 92.0078, kind: 'beach', descBn: 'সার্ফিং আর অ্যাডভেঞ্চার শটের হাব — ঢেউয়ের অ্যাকশন ক্যাপচারের আইডিয়াল স্পট' },
  { key: 'laldighi', nameBn: 'লালদিঘী', nameEn: 'Laldighi', lat: 21.4364, lng: 92.0060, kind: 'landmark', descBn: 'শহরের ঐতিহাসিক হার্ট — স্ট্রিট ও কালচারাল ফটোগ্রাফি' },
  { key: 'radiopark', nameBn: 'রেডিও পার্ক', nameEn: 'Radio Park', lat: 21.4190, lng: 92.0080, kind: 'park', descBn: 'কলাতলী সার্কেলের পাশে সবুজ ব্রেক — প্রি-ওয়েডিং পোর্ট্রেট' },
  { key: 'himchari', nameBn: 'হিমছড়ি', nameEn: 'Himchari', lat: 21.3736, lng: 92.0547, kind: 'park', descBn: 'ঝর্ণা + পাহাড় + সমুদ্র এক ফ্রেমে — ড্রোন ও ল্যান্ডস্কেপের জাদুভূমি' },
  { key: 'marine', nameBn: 'মেরিন ড্রাইভ', nameEn: 'Marine Drive', lat: 21.1800, lng: 92.1200, kind: 'drive', descBn: 'এশিয়ার সেরা কোস্টাল রোড — বাইক শট, ক্যান্ডিড ও গোল্ডেন আওয়ার' },
  { key: 'patuartek', nameBn: 'পাটুয়ারটেক', nameEn: 'Patuartek', lat: 21.0600, lng: 92.1900, kind: 'point', descBn: 'জেলেপাড়ার জীবন, লাল নৌকা, স্টর্মি ওয়েভ — ডকুমেন্টারি ফটোগ্রাফি' },
  { key: 'inani', nameBn: 'ইনানী সমুদ্র সৈকত', nameEn: 'Inani Beach', lat: 20.9964, lng: 92.2069, kind: 'beach', descBn: 'পাথর বিছানো সৈকত — টাইড পুল রিফ্লেকশন শটের স্বর্গ' },
  { key: 'teknaf', nameBn: 'টেকনাফ', nameEn: 'Teknaf', lat: 20.8700, lng: 92.2990, kind: 'point', descBn: 'নাফ নদীর মোহনা — দেশের শেষ প্রান্তের সানরাইজ' },
  { key: 'shahporir', nameBn: 'শাহপুরীর দ্বীপ', nameEn: 'Shah Porir Dwip', lat: 20.7600, lng: 92.3230, kind: 'island', descBn: 'নাফ নদীর বুকে দ্বীপ — ফিশারম্যান লাইফ ও ম্যানগ্রোভ' },
  { key: 'saintmartin', nameBn: 'সেন্ট মার্টিন', nameEn: "Saint Martin's", lat: 20.6247, lng: 92.3253, kind: 'island', descBn: 'বাংলাদেশের কোরাল দ্বীপ — ড্রাই সিজনের ড্রিম ডেস্টিনেশন শুট' },
  { key: 'cheradwip', nameBn: 'ছেড়া দ্বীপ', nameEn: 'Chera Dwip', lat: 20.6116, lng: 92.3310, kind: 'island', descBn: 'সেন্ট মার্টিনের প্রান্ত — মিল্কি ওয়ে ও নাইট অ্যাস্ট্রো শট' },
  { key: 'sonadia', nameBn: 'সোনাদিয়া দ্বীপ', nameEn: 'Sonadia Island', lat: 21.4750, lng: 91.9080, kind: 'island', descBn: 'ম্যানগ্রোভ ও প্রবাসী পাখি — ওয়াইল্ডলাইফ ফটোগ্রাফি' },
  { key: 'maheshkhali', nameBn: 'মহেশখালী', nameEn: 'Maheshkhali', lat: 21.5396, lng: 91.9817, kind: 'island', descBn: 'আদিনাথ মন্দির ও বাঁশখাম পাহাড় — আইল্যান্ড লাইফফটো' },
  { key: 'adinath', nameBn: 'আদিনাথ মন্দির', nameEn: 'Adinath Temple', lat: 21.5460, lng: 91.9670, kind: 'landmark', descBn: 'পাহাড়চূড়ার শিব মন্দির — আইল্যান্ড প্যানোরামা ভিউ' },
  { key: 'ramu', nameBn: 'রামু', nameEn: 'Ramu', lat: 21.4630, lng: 92.0810, kind: 'landmark', descBn: 'বৌদ্ধ বিহার ও কাশবন — হেরিটেজ ও কালচারাল শুট' },
  { key: 'aggmeda', nameBn: 'আগ্গমেডা খ্যাং', nameEn: 'Aggmeda Khyang', lat: 21.4420, lng: 92.0090, kind: 'landmark', descBn: 'শহরের প্রাচীন বৌদ্ধ মঠ — আর্কিটেকচারাল ফটোগ্রাফি' },
  { key: 'dulahazara', nameBn: 'দুলাহাজারা সাফারি পার্ক', nameEn: 'Dulahazara Safari Park', lat: 21.5960, lng: 92.0200, kind: 'park', descBn: 'বন্যপ্রাণী ও গ্রিন ফরেস্ট ব্যাকড্রপ' },
]

export const SPOT_KIND_BN: Record<Spot['kind'], string> = {
  beach: 'সৈকত', point: 'পয়েন্ট', island: 'দ্বীপ', landmark: 'ল্যান্ডমার্ক', park: 'পার্ক', drive: 'স্কেনিক রোড',
}

export const SPOT_BY_KEY = (key: string): Spot | undefined => COX_SPOTS.find((s) => s.key === key)

export const SITE = {
  name: 'ফটোলাগবে',
  nameEn: 'PhotoLagbe',
  tagline: 'কক্সবাজারের সেরা ফটোগ্রাফার — এক ক্লিকে',
}
