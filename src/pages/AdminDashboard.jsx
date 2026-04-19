import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

export default function AdminDashboard() {
  const [employees, setEmployees]     = useState([])
  const [attendanceMap, setAttendanceMap] = useState({})
  const [loading, setLoading]         = useState(true)
  const [refreshing, setRefreshing]   = useState(false)
  const today = new Date().toISOString().split('T')[0]

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    const [{ data: profiles }, { data: attendance }] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('attendance').select('*').eq('date', today),
    ])

    setEmployees(profiles || [])
    const map = {}
    ;(attendance || []).forEach(a => { map[a.employee_id] = a })
    setAttendanceMap(map)

    if (isRefresh) setRefreshing(false)
    else setLoading(false)
  }, [today])

  useEffect(() => { fetchData() }, [fetchData])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>

  // Derived stats
  const totalEmployees = employees.length
  const currentlyIn    = employees.filter(e => attendanceMap[e.id] && !attendanceMap[e.id].check_out_time).length
  const currentlyOut   = employees.filter(e => attendanceMap[e.id]?.check_out_time).length
  const hoursArr       = employees
    .map(e => parseFloat(attendanceMap[e.id]?.total_hours))
    .filter(h => !isNaN(h) && h > 0)
  const avgHours = hoursArr.length
    ? (hoursArr.reduce((a, b) => a + b, 0) / hoursArr.length).toFixed(1)
    : '—'

  const summaryCards = [
    { label: 'Total Employees', value: totalEmployees, color: '#333',     bg: '#f9f9f9' },
    { label: 'Currently IN',    value: currentlyIn,    color: '#1D9E75',  bg: '#E1F5EE' },
    { label: 'Currently OUT',   value: currentlyOut,   color: '#E24B4A',  bg: '#FFEBEE' },
    { label: 'Avg Hours Today', value: avgHours === '—' ? '—' : `${avgHours}h`, color: '#1565C0', bg: '#E3F2FD' },
  ]

  const getStatus = (emp) => {
    const att = attendanceMap[emp.id]
    if (!att) return 'Not yet'
    if (att.check_out_time) return 'OUT'
    return 'IN'
  }

  const statusStyle = (status) => {
    if (status === 'IN')      return { color: '#1D9E75', background: '#E1F5EE' }
    if (status === 'OUT')     return { color: '#E24B4A', background: '#FFEBEE' }
    return                           { color: '#888',    background: '#f0f0f0' }
  }

  const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '2rem' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
          <div>
            <h2 style={{ margin: 0 }}>Admin Dashboard</h2>
            <p style={{ margin: '4px 0 0', color: '#888', fontSize: '14px' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #1D9E75', color: '#1D9E75', background: 'white', cursor: 'pointer', fontSize: '14px' }}>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={handleLogout}
              style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '14px' }}>
              Logout
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', margin: '1.75rem 0' }}>
          {summaryCards.map(card => (
            <div key={card.label} style={{ background: 'white', borderRadius: '12px', padding: '1.25rem 1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
              <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#888' }}>{card.label}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ display: 'inline-block', background: card.bg, color: card.color, borderRadius: '8px', padding: '4px 10px', fontSize: '22px', fontWeight: '700' }}>
                  {card.value}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#333' }}>Employee Attendance</h3>
            <span style={{ fontSize: '13px', color: '#888' }}>{totalEmployees} employees</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['Name', 'Email', 'Status', 'Check In', 'Check Out', 'Total Hours'].map(h => (
                    <th key={h} style={{
                      padding: '11px 16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#888',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      borderBottom: '1px solid #eee',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>
                      No employees found in the profiles table.
                    </td>
                  </tr>
                )}
                {employees.map((emp, idx) => {
                  const att    = attendanceMap[emp.id]
                  const status = getStatus(emp)
                  const ss     = statusStyle(status)
                  return (
                    <tr key={emp.id} style={{ borderBottom: idx < employees.length - 1 ? '1px solid #f3f3f3' : 'none', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '13px 16px', fontSize: '14px', fontWeight: '500', color: '#222' }}>
                        {emp.full_name || '—'}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: '13px', color: '#666' }}>
                        {emp.email || '—'}
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{
                          ...ss,
                          display: 'inline-block',
                          borderRadius: '20px',
                          padding: '3px 12px',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}>
                          {status}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: '14px', color: '#555' }}>
                        {fmtTime(att?.check_in_time)}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: '14px', color: '#555' }}>
                        {fmtTime(att?.check_out_time)}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: '14px', fontWeight: att?.total_hours ? '600' : '400', color: att?.total_hours ? '#1D9E75' : '#bbb' }}>
                        {att?.total_hours ? `${att.total_hours}h` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
