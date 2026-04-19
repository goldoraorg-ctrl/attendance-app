import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/AdminDashboard'
import History from './pages/History'

export default function App() {
  const [session, setSession] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      if (session) {
        await fetchRole(session.user.id)
      }
      setLoading(false)
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session) {
        await fetchRole(session.user.id)
      } else {
        setRole(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchRole = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      if (data) setRole(data.role)
      else setRole('employee')
    } catch {
      setRole('employee')
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      <p style={{ color: '#888' }}>Loading...</p>
    </div>
  )

  const isAdmin = role === 'admin'

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          !session ? <Login /> : <Navigate to={isAdmin ? '/admin' : '/dashboard'} />
        } />
        <Route path="/dashboard" element={
          !session ? <Navigate to="/login" /> : <Dashboard session={session} />
        } />
        <Route path="/admin" element={
          !session ? <Navigate to="/login" /> : isAdmin ? <AdminDashboard session={session} /> : <Navigate to="/dashboard" />
        } />
        <Route path="/history" element={
          !session ? <Navigate to="/login" /> : <History session={session} />
        } />
        <Route path="*" element={
          <Navigate to={!session ? '/login' : isAdmin ? '/admin' : '/dashboard'} />
        } />
      </Routes>
    </BrowserRouter>
  )
}
