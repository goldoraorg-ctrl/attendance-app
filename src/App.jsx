import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/AdminDashboard'
import History from './pages/History'

export default function App() {
  const [session, setSession] = useState(null)
  const [role, setRole]       = useState(null)   // 'admin' | 'employee' | null
  const [loading, setLoading] = useState(true)

  const fetchRole = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    setRole(data?.role ?? 'employee')
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session) await fetchRole(session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session) {
        await fetchRole(session.user.id)
      } else {
        setRole(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>

  const homeRoute = role === 'admin' ? '/admin' : '/dashboard'

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route
          path="/login"
          element={!session ? <Login /> : <Navigate to={homeRoute} replace />}
        />

        {/* Employee only */}
        <Route
          path="/dashboard"
          element={
            !session ? <Navigate to="/login" replace /> :
            role === 'admin' ? <Navigate to="/admin" replace /> :
            <Dashboard session={session} />
          }
        />
        <Route
          path="/history"
          element={
            !session ? <Navigate to="/login" replace /> :
            role === 'admin' ? <Navigate to="/admin" replace /> :
            <History session={session} />
          }
        />

        {/* Admin only */}
        <Route
          path="/admin"
          element={
            !session ? <Navigate to="/login" replace /> :
            role !== 'admin' ? <Navigate to="/dashboard" replace /> :
            <AdminDashboard session={session} />
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to={session ? homeRoute : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
