/* ═══ AUTH BRIDGE (V32) ═══
   Cloudflare Pages (photolagbe.pages.dev) is production. Supabase Auth 的
   Site URL / Redirect URLs 仍指向旧 GitHub Pages 地址 — OAuth / recovery
   landing 会被甩到 yitube4k.github.io/PicLagbe。这里在 app 启动最早期检测:
   只要有 auth payload (access_token / error / PKCE code)，立刻带着完整
   hash+query 跳回 pages.dev — supabase-js 在那边正常捡起 session。
   (Must be the FIRST import in main.tsx so it runs before anything else.) */

(function () {
  try {
    const host = window.location.hostname;
    if (host !== 'yitube4k.github.io') return;

    const hash = window.location.hash || '';
    const search = window.location.search || '';
    const hasAuthPayload =
      hash.includes('access_token=') ||
      hash.includes('error=') ||
      search.includes('code=');
    if (!hasAuthPayload) return;

    // /PicLagbe/xxx → /xxx (pages.dev 用 root base)
    const path = window.location.pathname.replace(/^\/PicLagbe/, '') || '/';
    const target =
      'https://photolagbe.pages.dev' + path + search + hash;
    window.location.replace(target);
  } catch (e) {
    /* never block app boot */
  }
})();
