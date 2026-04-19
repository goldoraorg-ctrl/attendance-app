import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Dashboard({ session }) {
  const navigate = useNavigate()
  const [attendance, setAttendance] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState('')

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => { fetchTodayAttendance() }, [])

  const fetchTodayAttendance = async () => {
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', session.user.id)
      .eq('date', today)
      .single()
    setAttendance(data)
    setLoading(false)
  }

  const checkIn = async () => {
    setActionLoading(true)
    const { error } = await supabase.from('attendance').insert({
      employee_id: session.user.id,
      check_in_time: new Date().toISOString(),
      date: today
    })
    if (error) setMessage('Error: ' + error.message)
    else { setMessage('Checked in successfully!'); fetchTodayAttendance() }
    setActionLoading(false)
  }

  const checkOut = async () => {
    setActionLoading(true)
    const checkOutTime = new Date()
    const checkInTime = new Date(attendance.check_in_time)
    const totalHours = ((checkOutTime - checkInTime) / 3600000).toFixed(2)
    const { error } = await supabase.from('attendance').update({
      check_out_time: checkOutTime.toISOString(),
      total_hours: totalHours
    }).eq('id', attendance.id)
    if (error) setMessage('Error: ' + error.message)
    else { setMessage(`Checked out! Total hours: ${totalHours}`); fetchTodayAttendance() }
    setActionLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '2rem' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ margin: 0 }}>My Attendance</h2>
          <button onClick={handleLogout} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer' }}>
            Logout
          </button>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <p style={{ color: '#888', marginBottom: '0.5rem' }}>{new Date().toDateString()}</p>
          <p style={{ fontSize: '14px', color: '#555', marginBottom: '2rem' }}>{session.user.email}</p>

          {!attendance && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🟡</div>
              <p style={{ color: '#888', marginBottom: '1.5rem' }}>You haven't checked in yet today</p>
              <button onClick={checkIn} disabled={actionLoading}
                style={{ padding: '14px 40px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', cursor: 'pointer' }}>
                {actionLoading ? 'Processing...' : 'Check In'}
              </button>
            </>
          )}

          {attendance && !attendance.check_out_time && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🟢</div>
              <p style={{ color: '#1D9E75', fontWeight: '500', marginBottom: '0.5rem' }}>Currently Checked In</p>
              <p style={{ color: '#888', marginBottom: '1.5rem' }}>
                Since: {new Date(attendance.check_in_time).toLocaleTimeString()}
              </p>
              <button onClick={checkOut} disabled={actionLoading}
                style={{ padding: '14px 40px', background: '#E24B4A', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', cursor: 'pointer' }}>
                {actionLoading ? 'Processing...' : 'Check Out'}
              </button>
            </>
          )}

          {attendance && attendance.check_out_time && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '1rem' }}>✅</div>
              <p style={{ color: '#555', fontWeight: '500', marginBottom: '0.5rem' }}>Day Complete</p>
              <p style={{ color: '#888' }}>Check in: {new Date(attendance.check_in_time).toLocaleTimeString()}</p>
              <p style={{ color: '#888' }}>Check out: {new Date(attendance.check_out_time).toLocaleTimeString()}</p>
              <p style={{ fontSize: '24px', fontWeight: '500', color: '#1D9E75', marginTop: '1rem' }}>
                {attendance.total_hours} hours
              </p>
            </>
          )}

          {message && (
            <p style={{ marginTop: '1rem', color: '#1D9E75', fontWeight: '500' }}>{message}</p>
          )}

          <button onClick={() => navigate('/history')}
            style={{ marginTop: '1.5rem', padding: '10px 24px', borderRadius: '8px', border: '1px solid #1D9E75', color: '#1D9E75', background: 'white', cursor: 'pointer', fontSize: '14px' }}>
            View My History
          </button>
        </div>
      </div>
    </div>
  )
}