/**
 * কক্সবাজারের স্পটগুলোর আসল ছবি (Cloudinary-তে হোস্টেড)।
 * ডেলিভারিতে f_auto,q_auto যোগ হয় (cldUrl) — ব্রাউজারে WebP।
 * ব্যবহার: SpotPage hero, BlogPost location card, Home hero slider, Finder।
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
  sonadia: 'https://res.cloudinary.com/yrxtdqyo/image/upload/v1792092285/piclagbe/spots/hggysmkkdpxyisq2y4tv.jpg',
  maheshkhali: 'https://res.cloudinary.com/yrxtdqyo/image/upload/v1792092287/piclagbe/spots/qlpr1cphyz0oyk8cw7na.jpg',
  adinath: 'https://res.cloudinary.com/yrxtdqyo/image/upload/v1792092291/piclagbe/spots/thsfkahkno1htpjv1ptg.jpg',
  ramu: 'https://res.cloudinary.com/yrxtdqyo/image/upload/v1792092294/piclagbe/spots/cpghwwpq2o1ni6itg3kk.jpg',
  aggmeda: 'https://res.cloudinary.com/yrxtdqyo/image/upload/v1792092296/piclagbe/spots/jwt4ewxuhobzd4pbkia9.jpg',
  dulahazara: 'https://res.cloudinary.com/yrxtdqyo/image/upload/v1792092297/piclagbe/spots/owx4lqfodlpugdyutbwc.jpg',
  shahporir: 'https://res.cloudinary.com/yrxtdqyo/image/upload/v1792081816/qw53l2oyurlk4hc4nctk.jpg',
};

/** প্রতি স্পটের গ্যালারি (মূল ছবি + অতিরিক্ত) — ব্লগ/গাইড পেজে ব্যবহার */
export const SPOT_GALLERY: Record<string, string[]> = {
  laboni: [SPOT_PHOTOS.laboni],
  sugandha: [SPOT_PHOTOS.sugandha],
  kolatoli: [SPOT_PHOTOS.kolatoli],
  laldighi: [SPOT_PHOTOS.laldighi],
  radiopark: [SPOT_PHOTOS.radiopark],
  himchari: [SPOT_PHOTOS.himchari],
  marine: [SPOT_PHOTOS.marine],
  patuartek: [SPOT_PHOTOS.patuartek],
  inani: [SPOT_PHOTOS.inani],
  teknaf: [SPOT_PHOTOS.teknaf],
  saintmartin: [SPOT_PHOTOS.saintmartin],
  cheradwip: [SPOT_PHOTOS.cheradwip],
  sonadia: [SPOT_PHOTOS.sonadia, 'https://res.cloudinary.com/yrxtdqyo/image/upload/v1792092286/piclagbe/spots/zjg5paohrlxb9m5zpuuv.jpg'],
  maheshkhali: [SPOT_PHOTOS.maheshkhali, 'https://res.cloudinary.com/yrxtdqyo/image/upload/v1792092289/piclagbe/spots/zkjoevypmlipse1pddad.jpg'],
  adinath: [SPOT_PHOTOS.adinath, 'https://res.cloudinary.com/yrxtdqyo/image/upload/v1792092292/piclagbe/spots/fgjug0ouxakob4g3wqkt.jpg'],
  ramu: [SPOT_PHOTOS.ramu, 'https://res.cloudinary.com/yrxtdqyo/image/upload/v1792092295/piclagbe/spots/kgt8vybit5spo1yzq1vm.jpg'],
  aggmeda: [SPOT_PHOTOS.aggmeda, 'https://res.cloudinary.com/yrxtdqyo/image/upload/v1792092297/piclagbe/spots/zdswvzpc3irhcxlo0z1b.jpg'],
  dulahazara: [SPOT_PHOTOS.dulahazara, 'https://res.cloudinary.com/yrxtdqyo/image/upload/v1792092298/piclagbe/spots/f7nn7joh3qyyhloqjcro.jpg'],
  shahporir: [SPOT_PHOTOS.shahporir],
};

/** হেরো স্লাইডারের জন্য সবচেয়ে সুন্দর শটগুলো (অর্ডার গুরুত্বপূর্ণ) */
export const HERO_SLIDE_KEYS = ['saintmartin', 'inani', 'himchari', 'marine', 'laboni', 'sugandha', 'kolatoli', 'cheradwip', 'maheshkhali', 'patuartek', 'teknaf', 'sonadia', 'ramu', 'dulahazara', 'laldighi', 'radiopark', 'aggmeda', 'adinath', 'shahporir'];

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
  sonadia: ['সোনাদিয়া', 'sonadia'],
  maheshkhali: ['মহেশখালী', 'maheshkhali', 'মহেশখাল'],
  adinath: ['আদিনাথ', 'adinath'],
  ramu: ['রামু', 'ramu'],
  aggmeda: ['আগ্গমেডা', 'aggmeda', 'খ্যাং'],
  dulahazara: ['দুলাহাজারা', 'safari', 'সাফারি'],
  shahporir: ['শাহপুরী', 'shah porir', 'shahporir'],
};
