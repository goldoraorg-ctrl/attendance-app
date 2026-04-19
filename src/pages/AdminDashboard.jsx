import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function AdminDashboard() {
  const [employees, setEmployees] = useState([])
  const [attendanceMap, setAttendanceMap] = useState({})
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const [{ data: profiles }, { data: attendance }] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('attendance').select('*').eq('date', today)
    ])
    setEmployees(profiles || [])
    const map = {}
    ;(attendance || []).forEach(a => { map[a.employee_id] = a })
    setAttendanceMap(map)
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>

  const present = employees.filter(e => attendanceMap[e.id] && !attendanceMap[e.id].check_out_time).length
  const completed = employees.filter(e => attendanceMap[e.id]?.check_out_time).length
  const absent = employees.length - present - completed

  const summaryCards = [
    { label: 'Total Employees', value: employees.length, color: '#555' },
    { label: 'In Office',       value: present,           color: '#1D9E75' },
    { label: 'Day Complete',    value: completed,          color: '#2196F3' },
    { label: 'Absent',          value: absent,             color: '#E24B4A' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '2rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ margin: 0 }}>Admin Dashboard</h2>
          <button onClick={handleLogout}
            style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer' }}>
            Logout
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          {summaryCards.map(card => (
            <div key={card.label} style={{ flex: 1, background: 'white', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', textAlign: 'center' }}>
              <p style={{ margin: '0 0 6px', fontSize: '13px', color: '#888' }}>{card.label}</p>
              <p style={{ margin: 0, fontSize: '28px', fontWeight: '600', color: card.color }}>{card.value}</p>
            </div>
          ))}
        </div>

        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f0f0f0' }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>Today — {new Date().toDateString()}</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['Employee', 'Department', 'Status', 'Check In', 'Check Out', 'Hours'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '13px', color: '#888', fontWeight: '500', borderBottom: '1px solid #f0f0f0' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                      No employees found
                    </td>
                  </tr>
                )}
                {employees.map(emp => {
                  const att = attendanceMap[emp.id]
                  const status = !att ? 'Absent' : att.check_out_time ? 'Complete' : 'In Office'
                  const statusColor = status === 'In Office' ? '#1D9E75' : status === 'Complete' ? '#2196F3' : '#E24B4A'
                  const statusBg   = status === 'In Office' ? '#E1F5EE' : status === 'Complete' ? '#E3F2FD' : '#FFEBEE'
                  return (
                    <tr key={emp.id} style={{ borderBottom: '1px solid #f7f7f7' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '500' }}>
                        {emp.full_name || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: '#888' }}>
                        {emp.department || '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: statusBg, color: statusColor, borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: '500' }}>
                          {status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: '#555' }}>
                        {att?.check_in_time ? new Date(att.check_in_time).toLocaleTimeString() : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: '#555' }}>
                        {att?.check_out_time ? new Date(att.check_out_time).toLocaleTimeString() : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: '#555' }}>
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
