import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function History({ session }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    const from = new Date()
    from.setDate(from.getDate() - 30)
    const fromDate = from.toISOString().split('T')[0]

    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', session.user.id)
      .gte('date', fromDate)
      .order('date', { ascending: false })

    setRecords(data || [])
    setLoading(false)
  }

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>

  const totalDays  = records.length
  const totalHours = records.reduce((sum, r) => sum + (parseFloat(r.total_hours) || 0), 0).toFixed(1)
  const avgHours   = totalDays ? (totalHours / totalDays).toFixed(1) : '0.0'

  const summaryCards = [
    { label: 'Days Present',   value: totalDays,      color: '#1D9E75' },
    { label: 'Total Hours',    value: `${totalHours}h`, color: '#2196F3' },
    { label: 'Avg Hours / Day', value: `${avgHours}h`, color: '#FF9800' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '2rem' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ margin: 0 }}>My Attendance History</h2>
          <button onClick={() => navigate('/dashboard')}
            style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer' }}>
            ← Back
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          {summaryCards.map(card => (
            <div key={card.label} style={{ flex: 1, background: 'white', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', textAlign: 'center' }}>
              <p style={{ margin: '0 0 6px', fontSize: '13px', color: '#888' }}>{card.label}</p>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: card.color }}>{card.value}</p>
            </div>
          ))}
        </div>

        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f0f0f0' }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>Last 30 Days</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['Date', 'Check In', 'Check Out', 'Total Hours', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '13px', color: '#888', fontWeight: '500', borderBottom: '1px solid #f0f0f0' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                      No attendance records in the last 30 days
                    </td>
                  </tr>
                )}
                {records.map(r => {
                  const complete = !!r.check_out_time
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f7f7f7' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '500' }}>
                        {new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: '#555' }}>
                        {new Date(r.check_in_time).toLocaleTimeString()}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: '#555' }}>
                        {r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '500', color: '#1D9E75' }}>
                        {r.total_hours ? `${r.total_hours}h` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          background: complete ? '#E1F5EE' : '#FFF3E0',
                          color:      complete ? '#1D9E75' : '#E65100',
                          borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: '500'
                        }}>
                          {complete ? 'Complete' : 'In Progress'}
                        </span>
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
