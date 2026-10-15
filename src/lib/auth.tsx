import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from './supabase'
import type { Profile } from './types'
import type { Session } from '@supabase/supabase-js'

type AuthCtx = {
  session: Session | null
  profile: Profile | null
  loading: boolean
  refresh: () => Promise<void>
}

const Ctx = createContext<AuthCtx>({ session: null, profile: null, loading: true, refresh: async () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    setProfile(data as Profile | null)
  }

  const refresh = async () => {
    const { data } = await supabase.auth.getSession()
    const s = data.session
    setSession(s)
    if (s?.user) await loadProfile(s.user.id)
    else setProfile(null)
  }

  useEffect(() => {
    let mounted = true
    refresh().finally(() => { if (mounted) setLoading(false) })
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s)
      if (s?.user) await loadProfile(s.user.id)
      else setProfile(null)
      if (mounted) setLoading(false)
    })
    return () => { mounted = false; sub.subscription.unsubscribe() }
  }, [])

  return <Ctx.Provider value={{ session, profile, loading, refresh }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
