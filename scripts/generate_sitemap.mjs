// V27 — dist/sitemap.xml জেনারেটর (vite build-এর পরে চালাতে হয়)
// স্ট্যাটিক রুট + Supabase থেকে approved ফটোগ্রাফারদের slug URL।
// কোনো এরর হলেও স্ট্যাটিক-অনলি sitemap লেখা হয় — কখনো throw করে না।
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://fiixytfznzppwgsogmnm.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1k9ZQHtBPZKkxueeAaz9jQ_TaktMdL6';
const SITE_URL = 'https://photolagbe.pages.dev';

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function generateSitemap() {
  let photographers = [];
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/photographers?select=slug,id,updated_at&profile_status=eq.approved`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      photographers = await res.json();
    }
  } catch (err) {
    console.warn('Warning: Failed to fetch photographers for sitemap, generating static entries only:', err.message);
  }

  // V28 — পাবলিশড ব্লগ পোস্টও sitemap-এ যোগ হয়
  let blogPosts = [];
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts?select=slug,created_at&published=eq.true&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      blogPosts = await res.json();
    }
  } catch (err) {
    console.warn('Warning: Failed to fetch blog posts for sitemap:', err.message);
  }

  const staticPages = [
    { url: '/', changefreq: 'daily', priority: '1.0' },
    { url: '/photographers', changefreq: 'daily', priority: '0.9' },
    { url: '/finder', changefreq: 'weekly', priority: '0.8' },
    { url: '/how-it-works', changefreq: 'monthly', priority: '0.7' },
    { url: '/blog', changefreq: 'daily', priority: '0.8' },
    { url: '/community', changefreq: 'weekly', priority: '0.6' }
  ];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const page of staticPages) {
    xml += '  <url>\n';
    xml += `    <loc>${SITE_URL}${page.url}</loc>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += '  </url>\n';
  }

  for (const p of photographers) {
    const identifier = p.slug || p.id;
    if (!identifier) continue;
    const lastmod = p.updated_at ? `<lastmod>${p.updated_at.split('T')[0]}</lastmod>` : '';
    xml += '  <url>\n';
    xml += `    <loc>${SITE_URL}/photographer/${esc(identifier)}</loc>\n`;
    if (lastmod) xml += `    ${lastmod}\n`;
    xml += '    <changefreq>weekly</changefreq>\n';
    xml += '    <priority>0.8</priority>\n';
    xml += '  </url>\n';
  }

  // V28 — ব্লগ পোস্ট URLs
  for (const bp of blogPosts) {
    if (!bp.slug) continue;
    const lastmod = bp.created_at ? `<lastmod>${bp.created_at.split('T')[0]}</lastmod>` : '';
    xml += '  <url>\n';
    xml += `    <loc>${SITE_URL}/blog/${esc(bp.slug)}</loc>\n`;
    if (lastmod) xml += `    ${lastmod}\n`;
    xml += '    <changefreq>weekly</changefreq>\n';
    xml += '    <priority>0.7</priority>\n';
    xml += '  </url>\n';
  }

  xml += '</urlset>';

  const distDir = resolve('dist');
  mkdirSync(distDir, { recursive: true });
  writeFileSync(resolve(distDir, 'sitemap.xml'), xml, 'utf8');
  console.log(`sitemap.xml: ${staticPages.length} static + ${photographers.length} photographers + ${blogPosts.length} blog posts = ${staticPages.length + photographers.length + blogPosts.length} URLs`);
}

generateSitemap();
