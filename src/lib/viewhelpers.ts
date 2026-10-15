import { useEffect } from 'react'

export { toBn, taka, bnDate } from './utils'

// Increment profile_views once per photographer per session (debounced)
export function useDebouncedView(photographerId: string | null) {
  useEffect(() => {
    if (!photographerId) return
    const key = 'pl_view_' + photographerId
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    import('./supabase').then(({ supabase }) => {
      supabase.rpc('increment_profile_views', { pid: photographerId }).then(() => {}, () => {})
    })
  }, [photographerId])
}
