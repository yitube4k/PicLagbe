/**
 * কক্সবাজারের স্পটগুলোর আসল ছবি (Cloudinary-তে হোস্টেড)।
 * ডেলিভারিতে f_auto,q_auto যোগ হয় (cldUrl) — ব্রাউজারে WebP।
 * ব্যবহার: SpotPage hero, BlogPost location card, Finder।
 */
export const SPOT_PHOTOS: Record<string, string> = {
  laboni: 'https://res.cloudinary.com/yrxtdqyo/image/upload/v1792081797/r0r9shk5ipfuyz9ykdyl.jpg',
  sugandha: 'https://res.cloudinary.com/yrxtdqyo/image/upload/v1792081799/vyorwur4xkxgpdaawnfe.jpg',
  kolatoli: 'https://res.cloudinary.com/yrxtdqyo/image/upload/v1792081802/wfqititg2lswarqsewsq.jpg',
  laldighi: 'https://res.cloudinary.com/yrxtdqyo/image/upload/v1792081803/spt8lqd6dmd5lxhbbqsc.jpg',
  radiopark: 'https://res.cloudinary.com/yrxtdqyo/image/upload/v1792081805/osvmmouksjmbxfvhnuv9.jpg',
  himchari: 'https://res.cloudinary.com/yrxtdqyo/image/upload/v1792081807/qetpl55afzbkab6fr2md.png',
  marine: 'https://res.cloudinary.com/yrxtdqyo/image/upload/v1792081810/dvz5mkjujebdbcthbcje.jpg',
  patuartek: 'https://res.cloudinary.com/yrxtdqyo/image/upload/v1792081812/tnuyyqss4ehaaj8hutar.jpg',
  inani: 'https://res.cloudinary.com/yrxtdqyo/image/upload/v1792081814/kzqbv1l859jgrrdrs8q4.jpg',
  teknaf: 'https://res.cloudinary.com/yrxtdqyo/image/upload/v1792081816/qw53l2oyurlk4hc4nctk.jpg',
  saintmartin: 'https://res.cloudinary.com/yrxtdqyo/image/upload/v1792081817/bjuuhp0gxpavvisnlz9g.jpg',
  cheradwip: 'https://res.cloudinary.com/yrxtdqyo/image/upload/v1792081820/nehddbsjvtj9ymaydkwy.jpg',
};

/** হেডিং টেক্সট (বাংলা/ইংরেজি) থেকে স্পট key মিলিয়ে দেয় */
export function matchSpotKey(heading: string): string | null {
  const h = heading.toLowerCase();
  for (const [key, name] of Object.entries(SPOT_NAME_ALIASES)) {
    if (name.some((alias) => h.includes(alias))) return key;
  }
  return null;
}

const SPOT_NAME_ALIASES: Record<string, string[]> = {
  laboni: ['লাবণী', 'laboni'],
  sugandha: ['সুগন্ধা', 'sugandha'],
  kolatoli: ['কলাতলী', 'kolatoli'],
  laldighi: ['লালদিঘী', 'laldighi'],
  radiopark: ['রেডিও পার্ক', 'radio park'],
  himchari: ['হিমছড়ি', 'হিমছড়ে', 'himchari', 'himchhari'],
  marine: ['মেরিন ড্রাইভ', 'marine drive'],
  patuartek: ['পাটুয়ারটেক', 'patuartek'],
  inani: ['ইনানী', 'inani'],
  teknaf: ['টেকনাফ', 'teknaf'],
  saintmartin: ['সেন্ট মার্টিন', 'saint martin', 'st. martin', 'st martin'],
  cheradwip: ['ছেড়া দ্বীপ', 'ছেড়াদ্বীপ', 'chera dwip', 'cheradwip'],
};
