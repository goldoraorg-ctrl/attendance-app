import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

const EMPTY_FORM = { full_name: '', email: '', password: '', department: '', role: 'employee' }

function AddEmployeeModal({ onClose, onSuccess }) {
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState('')

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    // 1. Create auth account
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email:    form.email,
      password: form.password,
    })

    if (signUpError) {
      setError(signUpError.message)
      setSubmitting(false)
      return
    }

    const userId = authData?.user?.id
    if (!userId) {
      setError('Account created but could not retrieve user ID. Please refresh.')
      setSubmitting(false)
      return
    }

    // 2. Insert profile row
    const { error: profileError } = await supabase.from('profiles').insert({
      id:         userId,
      full_name:  form.full_name,
      email:      form.email,
      department: form.department,
      role:       form.role,
    })

    if (profileError) {
      setError('Auth account created but profile insert failed: ' + profileError.message)
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    onSuccess()
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: '7px',
    border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box',
    outline: 'none', marginTop: '5px',
  }
  const labelStyle = { fontSize: '13px', fontWeight: '500', color: '#444', display: 'block' }

  return (
    // Backdrop
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '1rem',
      }}>
      {/* Modal */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: '14px', padding: '2rem',
          width: '100%', maxWidth: '440px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '18px' }}>Add Employee</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888', lineHeight: 1 }}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            <div>
              <label style={labelStyle}>Full Name</label>
              <input
                name="full_name" value={form.full_name} onChange={handleChange}
                placeholder="e.g. Sarah Ahmed"
                style={inputStyle} required />
            </div>

            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email" name="email" value={form.email} onChange={handleChange}
                placeholder="employee@company.com"
                style={inputStyle} required />
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <input
                type="password" name="password" value={form.password} onChange={handleChange}
                placeholder="Minimum 6 characters"
                style={inputStyle} minLength={6} required />
            </div>

            <div>
              <label style={labelStyle}>Department</label>
              <input
                name="department" value={form.department} onChange={handleChange}
                placeholder="e.g. Engineering"
                style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Role</label>
              <select
                name="role" value={form.role} onChange={handleChange}
                style={{ ...inputStyle, background: 'white', cursor: 'pointer' }}>
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
            </div>

          </div>

          {error && (
            <p style={{ marginTop: '1rem', marginBottom: 0, color: '#E24B4A', fontSize: '13px', background: '#FFEBEE', padding: '8px 12px', borderRadius: '6px' }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
            <button
              type="button" onClick={onClose}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '14px' }}>
              Cancel
            </button>
            <button
              type="submit" disabled={submitting}
              style={{ flex: 2, padding: '10px', borderRadius: '8px', border: 'none', background: submitting ? '#a0d9c5' : '#1D9E75', color: 'white', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '600' }}>
              {submitting ? 'Adding...' : 'Add Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [employees,    setEmployees]    = useState([])
  const [attendanceMap, setAttendanceMap] = useState({})
  const [loading,      setLoading]      = useState(true)
  const [refreshing,   setRefreshing]   = useState(false)
  const [showModal,    setShowModal]    = useState(false)
  const [successMsg,   setSuccessMsg]   = useState('')
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

  const handleEmployeeAdded = () => {
    setShowModal(false)
    setSuccessMsg('Employee added successfully! They can now log in.')
    fetchData(true)
    setTimeout(() => setSuccessMsg(''), 5000)
  }

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
    { label: 'Total Employees', value: totalEmployees,                           color: '#333',    bg: '#f9f9f9' },
    { label: 'Currently IN',    value: currentlyIn,                              color: '#1D9E75', bg: '#E1F5EE' },
    { label: 'Currently OUT',   value: currentlyOut,                             color: '#E24B4A', bg: '#FFEBEE' },
    { label: 'Avg Hours Today', value: avgHours === '—' ? '—' : `${avgHours}h`, color: '#1565C0', bg: '#E3F2FD' },
  ]

  const getStatus = (emp) => {
    const att = attendanceMap[emp.id]
    if (!att) return 'Not yet'
    if (att.check_out_time) return 'OUT'
    return 'IN'
  }

  const statusStyle = (status) => {
    if (status === 'IN')  return { color: '#1D9E75', background: '#E1F5EE' }
    if (status === 'OUT') return { color: '#E24B4A', background: '#FFEBEE' }
    return                       { color: '#888',    background: '#f0f0f0' }
  }

  const fmtTime = (iso) =>
    iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '2rem' }}>
      {showModal && (
        <AddEmployeeModal
          onClose={() => setShowModal(false)}
          onSuccess={handleEmployeeAdded}
        />
      )}

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
              onClick={() => setShowModal(true)}
              style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#1D9E75', color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
              + Add Employee
            </button>
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

        {/* Success banner */}
        {successMsg && (
          <div style={{ marginTop: '1rem', padding: '10px 16px', background: '#E1F5EE', borderRadius: '8px', color: '#085041', fontSize: '14px', fontWeight: '500' }}>
            {successMsg}
          </div>
        )}

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', margin: '1.75rem 0' }}>
          {summaryCards.map(card => (
            <div key={card.label} style={{ background: 'white', borderRadius: '12px', padding: '1.25rem 1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
              <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#888' }}>{card.label}</p>
              <span style={{ display: 'inline-block', background: card.bg, color: card.color, borderRadius: '8px', padding: '4px 10px', fontSize: '22px', fontWeight: '700' }}>
                {card.value}
              </span>
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
                      padding: '11px 16px', textAlign: 'left', fontSize: '12px',
                      fontWeight: '600', color: '#888', textTransform: 'uppercase',
                      letterSpacing: '0.04em', borderBottom: '1px solid #eee',
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
                      No employees found. Add one using the button above.
                    </td>
                  </tr>
                )}
                {employees.map((emp, idx) => {
                  const att    = attendanceMap[emp.id]
                  const status = getStatus(emp)
                  const ss     = statusStyle(status)
                  return (
                    <tr
                      key={emp.id}
                      style={{ borderBottom: idx < employees.length - 1 ? '1px solid #f3f3f3' : 'none', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '13px 16px', fontSize: '14px', fontWeight: '500', color: '#222' }}>
                        {emp.full_name || '—'}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: '13px', color: '#666' }}>
                        {emp.email || '—'}
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ ...ss, display: 'inline-block', borderRadius: '20px', padding: '3px 12px', fontSize: '12px', fontWeight: '600' }}>
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
