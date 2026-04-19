import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/AdminDashboard'
import History from './pages/History'

const LOAD_TIMEOUT_MS = 5000

async function fetchRoleWithTimeout(userId) {
  const fetchPromise = supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('role fetch timeout')), LOAD_TIMEOUT_MS)
  )

  const { data } = await Promise.race([fetchPromise, timeoutPromise])
  return data?.role ?? 'employee'
}

export default function App() {
  const [session, setSession] = useState(null)
  const [role, setRole]       = useState('employee')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Hard timeout: never stay stuck on Loading longer than 5 seconds
    const safetyTimer = setTimeout(() => setLoading(false), LOAD_TIMEOUT_MS)

    supabase.auth.getSession()
      .then(async ({ data: { session }, error }) => {
        if (error) {
          console.error('getSession error:', error.message)
          return
        }
        setSession(session)
        if (session) {
          try {
            const role = await fetchRoleWithTimeout(session.user.id)
            setRole(role)
          } catch (e) {
            console.warn('Could not fetch role, defaulting to employee:', e.message)
          }
        }
      })
      .catch((e) => console.error('Unexpected auth error:', e.message))
      .finally(() => {
        clearTimeout(safetyTimer)
        setLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        if (session) {
          try {
            const role = await fetchRoleWithTimeout(session.user.id)
            setRole(role)
          } catch (e) {
            console.warn('Could not fetch role on auth change, defaulting to employee:', e.message)
            setRole('employee')
          }
        } else {
          setRole('employee')
        }
      }
    )

    return () => {
      clearTimeout(safetyTimer)
      subscription.unsubscribe()
    }
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
            !session            ? <Navigate to="/login"     replace /> :
            role === 'admin'    ? <Navigate to="/admin"     replace /> :
            <Dashboard session={session} />
          }
        />
        <Route
          path="/history"
          element={
            !session            ? <Navigate to="/login"     replace /> :
            role === 'admin'    ? <Navigate to="/admin"     replace /> :
            <History session={session} />
          }
        />

        {/* Admin only */}
        <Route
          path="/admin"
          element={
            !session            ? <Navigate to="/login"     replace /> :
            role !== 'admin'    ? <Navigate to="/dashboard" replace /> :
            <AdminDashboard session={session} />
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to={session ? homeRoute : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
