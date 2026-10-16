/**
 * GitHub Pages base-aware path helper.
 * window.open('/x') drops the Vite base (/PicLagbe/) → global GitHub 404.
 * Always route internal opens through withBase().
 */
export const BASE = import.meta.env.BASE_URL || '/';

export function withBase(path: string): string {
  const clean = path.replace(/^\/+/, '');
  return `${BASE.replace(/\/+$/, '')}/${clean}`;
}

/** Open an internal app path in a new tab, respecting the deploy base. */
export function openApp(path: string): void {
  window.open(withBase(path), '_blank', 'noopener,noreferrer');
}
