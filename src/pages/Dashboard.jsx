import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const OFFICE_LAT    = 24.7061345
const OFFICE_LNG    = 46.6743753
const OFFICE_RADIUS = 100

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function Dashboard({ session }) {
  const [attendance, setAttendance]     = useState(null)
  const [status, setStatus]             = useState('Initializing location...')
  const [insideOffice, setInsideOffice] = useState(false)
  const [distance, setDistance]         = useState(null)
  const [loading, setLoading]           = useState(true)
  const intervalRef                     = useRef(null)
  const navigate                        = useNavigate()
  const today                           = new Date().toISOString().split('T')[0]

  useEffect(() => {
    fetchTodayAttendance().then(() => checkLocation())
    intervalRef.current = setInterval(checkLocation, 3 * 60 * 1000)
    return () => clearInterval(intervalRef.current)
  }, [])

  const fetchTodayAttendance = async () => {
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', session.user.id)
      .eq('date', today)
      .single()
    setAttendance(data ?? null)
    setLoading(false)
    return data ?? null
  }

  const checkLocation = () => {
    setStatus('Checking your location...')
    if (!navigator.geolocation) {
      setStatus('Geolocation is not supported by your browser.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        const dist = getDistance(latitude, longitude, OFFICE_LAT, OFFICE_LNG)
        const rounded = Math.round(dist)
        setDistance(rounded)

        if (dist <= OFFICE_RADIUS) {
          setInsideOffice(true)
          setStatus('You are inside the office')
          await handleAutoCheckIn(latitude, longitude)
        } else {
          setInsideOffice(false)
          setStatus(`You are ${rounded}m away from the office`)
          await handleAutoCheckOut()
        }
      },
      (err) => {
        const msgs = {
          1: 'Location access denied. Please allow location in your browser settings.',
          2: 'Location unavailable. Please try again.',
          3: 'Location request timed out. Please try again.',
        }
        setStatus(msgs[err.code] || 'Could not get location.')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleAutoCheckIn = async (lat, lng) => {
    const { data: existing } = await supabase
      .from('attendance')
      .select('id')
      .eq('employee_id', session.user.id)
      .eq('date', today)
      .single()
    if (existing) return
    await supabase.from('attendance').insert({
      employee_id:   session.user.id,
      date:          today,
      check_in_time: new Date().toISOString(),
      location_lat:  lat,
      location_lng:  lng,
    })
    await fetchTodayAttendance()
  }

  const handleAutoCheckOut = async () => {
    const { data: existing } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', session.user.id)
      .eq('date', today)
      .single()
    if (!existing || existing.check_out_time) return
    const checkOutTime = new Date()
    const totalHours   = ((checkOutTime - new Date(existing.check_in_time)) / 3600000).toFixed(2)
    await supabase.from('attendance').update({
      check_out_time: checkOutTime.toISOString(),
      total_hours:    totalHours,
    }).eq('id', existing.id)
    await fetchTodayAttendance()
  }

  const handleLogout = async () => {
    clearInterval(intervalRef.current)
    await supabase.auth.signOut()
  }

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '2rem' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ margin: 0 }}>My Attendance</h2>
          <button onClick={handleLogout}
            style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', background: 'white' }}>
            Logout
          </button>
        </div>

        {/* Main card */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <p style={{ color: '#888', marginBottom: '4px' }}>{new Date().toDateString()}</p>
          <p style={{ fontSize: '14px', color: '#555', marginBottom: '1.5rem' }}>{session.user.email}</p>

          {/* Location status banner */}
          <div style={{
            background: insideOffice ? '#E1F5EE' : '#FFF3E0',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '1.5rem',
          }}>
            <p style={{ margin: 0, fontWeight: '500', color: insideOffice ? '#085041' : '#E65100', fontSize: '14px' }}>
              {status}
            </p>
            {distance !== null && (
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#888' }}>
                Distance from office: {distance}m &nbsp;·&nbsp; Radius: {OFFICE_RADIUS}m
              </p>
            )}
          </div>

          {/* Attendance state */}
          {!attendance && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '0.75rem' }}>🟡</div>
              <p style={{ color: '#888', margin: 0 }}>Not checked in — move within {OFFICE_RADIUS}m of the office to auto check-in</p>
            </>
          )}

          {attendance && !attendance.check_out_time && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '0.75rem' }}>🟢</div>
              <p style={{ color: '#1D9E75', fontWeight: '600', marginBottom: '4px' }}>Checked In</p>
              <p style={{ color: '#888', margin: 0 }}>Since: {new Date(attendance.check_in_time).toLocaleTimeString()}</p>
            </>
          )}

          {attendance && attendance.check_out_time && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '0.75rem' }}>✅</div>
              <p style={{ color: '#555', fontWeight: '600', marginBottom: '8px' }}>Day Complete</p>
              <p style={{ color: '#888', margin: '2px 0' }}>In: &nbsp;{new Date(attendance.check_in_time).toLocaleTimeString()}</p>
              <p style={{ color: '#888', margin: '2px 0' }}>Out: {new Date(attendance.check_out_time).toLocaleTimeString()}</p>
              <p style={{ fontSize: '26px', fontWeight: '600', color: '#1D9E75', marginTop: '0.75rem' }}>
                {attendance.total_hours}h
              </p>
            </>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '1.75rem' }}>
            <button onClick={checkLocation}
              style={{ padding: '10px 22px', borderRadius: '8px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '14px' }}>
              Refresh Location
            </button>
            <button onClick={() => navigate('/history')}
              style={{ padding: '10px 22px', borderRadius: '8px', border: '1px solid #1D9E75', color: '#1D9E75', background: 'white', cursor: 'pointer', fontSize: '14px' }}>
              View My History
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
