import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/AdminDashboard'
import History from './pages/History'

export default function App() {
  const [session, setSession] = useState(null)
  const [role, setRole] = useState('employee')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session) {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
        setRole(data?.role ?? 'employee')
      }
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p>Loading...</p>
    </div>
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to={role === 'admin' ? '/admin' : '/dashboard'} />} />
        <Route path="/dashboard" element={session ? <Dashboard session={session} /> : <Navigate to="/login" />} />
        <Route path="/admin" element={session && role === 'admin' ? <AdminDashboard session={session} /> : <Navigate to="/login" />} />
        <Route path="/history" element={session ? <History session={session} /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to={session ? (role === 'admin' ? '/admin' : '/dashboard') : '/login'} />} />
      </Routes>
    </BrowserRouter>
  )
}
