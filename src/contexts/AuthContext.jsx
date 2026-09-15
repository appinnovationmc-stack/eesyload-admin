import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [adminUser, setAdminUser] = useState(null) // { id, email, role }
  const [loading, setLoading] = useState(true)

  async function loadAdminUser(userId) {
    if (!userId) {
      setAdminUser(null)
      return
    }
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, email, role')
      .eq('id', userId)
      .single()

    if (error || !data) {
      setAdminUser(null) // authenticated but not an admin — access denied downstream
    } else {
      setAdminUser(data)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      loadAdminUser(session?.user?.id).finally(() => setLoading(false))
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      loadAdminUser(session?.user?.id)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const value = {
    session,
    adminUser,
    loading,
    signIn,
    signOut,
    isOwner: adminUser?.role === 'owner',
    isFinance: adminUser?.role === 'finance' || adminUser?.role === 'owner',
    isSupport: !!adminUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
