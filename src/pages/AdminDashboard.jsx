import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

const EMPTY_FORM = { full_name: '', email: '', password: '', department: '' }

// ── Add Employee Modal ────────────────────────────────────────────────────────

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

    // Step 1: create auth account
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
      setError('Account created but user ID was not returned. Please try again.')
      setSubmitting(false)
      return
    }

    // Step 2: insert profile
    const { error: profileError } = await supabase.from('profiles').insert({
      id:         userId,
      full_name:  form.full_name,
      email:      form.email,
      department: form.department,
      role:       'employee',
    })

    if (profileError) {
      setError('Auth account created but profile save failed: ' + profileError.message)
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    onSuccess()
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', marginTop: '5px',
    borderRadius: '7px', border: '1px solid #ddd',
    fontSize: '14px', boxSizing: 'border-box', outline: 'none',
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: '14px', padding: '2rem',
          width: '100%', maxWidth: '420px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '18px' }}>Add Employee</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#aaa', lineHeight: 1 }}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            <div>
              <label style={{ fontSize: '13px', fontWeight: '500', color: '#444' }}>Full Name</label>
              <input
                name="full_name" value={form.full_name} onChange={handleChange}
                placeholder="e.g. Ahmed Al-Rashid" style={inputStyle} required />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: '500', color: '#444' }}>Email</label>
              <input
                type="email" name="email" value={form.email} onChange={handleChange}
                placeholder="employee@company.com" style={inputStyle} required />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: '500', color: '#444' }}>Password</label>
              <input
                type="password" name="password" value={form.password} onChange={handleChange}
                placeholder="Minimum 6 characters" style={inputStyle} minLength={6} required />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: '500', color: '#444' }}>Department</label>
              <input
                name="department" value={form.department} onChange={handleChange}
                placeholder="e.g. Engineering" style={inputStyle} />
            </div>

          </div>

          {error && (
            <p style={{
              marginTop: '1rem', marginBottom: 0, fontSize: '13px',
              color: '#c0392b', background: '#fff0f0',
              padding: '8px 12px', borderRadius: '6px',
            }}>
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
              style={{
                flex: 2, padding: '10px', borderRadius: '8px', border: 'none',
                background: submitting ? '#a8d5c2' : '#1D9E75',
                color: 'white', cursor: submitting ? 'not-allowed' : 'pointer',
                fontSize: '14px', fontWeight: '600',
              }}>
              {submitting ? 'Adding...' : 'Add Employee'}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminDashboard({ session }) {
  const [employees,     setEmployees]     = useState([])
  const [attendanceMap, setAttendanceMap] = useState({})
  const [loading,       setLoading]       = useState(true)
  const [refreshing,    setRefreshing]    = useState(false)
  const [showModal,     setShowModal]     = useState(false)
  const [successMsg,    setSuccessMsg]    = useState('')
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
    setSuccessMsg('Employee added! They can now log in with their email and password.')
    fetchData(true)
    setTimeout(() => setSuccessMsg(''), 5000)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>

  // ── Derived stats
  const totalEmployees = employees.length
  const currentlyIn    = employees.filter(e => attendanceMap[e.id] && !attendanceMap[e.id].check_out_time).length
  const currentlyOut   = employees.filter(e => attendanceMap[e.id]?.check_out_time).length

  const getStatus = (emp) => {
    const att = attendanceMap[emp.id]
    if (!att)              return 'Not yet'
    if (att.check_out_time) return 'OUT'
    return 'IN'
  }

  const statusChip = (status) => {
    const styles = {
      'IN':      { color: '#1D9E75', background: '#E1F5EE' },
      'OUT':     { color: '#E24B4A', background: '#FFEBEE' },
      'Not yet': { color: '#888',    background: '#f0f0f0' },
    }
    return styles[status] || styles['Not yet']
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

      <div style={{ maxWidth: '980px', margin: '0 auto' }}>

        {/* ── Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
          <div>
            <h2 style={{ margin: 0 }}>Admin Dashboard</h2>
            <p style={{ margin: '4px 0 0', color: '#888', fontSize: '14px' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => setShowModal(true)}
              style={{
                padding: '9px 18px', borderRadius: '7px', border: 'none',
                background: '#1D9E75', color: 'white',
                fontSize: '14px', fontWeight: '600', cursor: 'pointer',
              }}>
              + Add Employee
            </button>
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              style={{
                padding: '9px 16px', borderRadius: '7px',
                border: '1px solid #1D9E75', color: '#1D9E75',
                background: 'white', fontSize: '14px', cursor: 'pointer',
              }}>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: '9px 16px', borderRadius: '7px',
                border: '1px solid #ddd', background: 'white',
                fontSize: '14px', cursor: 'pointer',
              }}>
              Logout
            </button>
          </div>
        </div>

        {/* ── Success banner */}
        {successMsg && (
          <div style={{
            marginBottom: '1.25rem', padding: '11px 16px',
            background: '#E1F5EE', borderRadius: '8px',
            color: '#085041', fontSize: '14px', fontWeight: '500',
          }}>
            {successMsg}
          </div>
        )}

        {/* ── Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
          {[
            { label: 'Total Employees', value: totalEmployees, color: '#333',    bg: '#f4f4f4' },
            { label: 'Currently IN',    value: currentlyIn,    color: '#1D9E75', bg: '#E1F5EE' },
            { label: 'Currently OUT',   value: currentlyOut,   color: '#E24B4A', bg: '#FFEBEE' },
          ].map(card => (
            <div key={card.label} style={{
              background: 'white', borderRadius: '12px',
              padding: '1.25rem 1.5rem',
              boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
            }}>
              <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#888' }}>{card.label}</p>
              <span style={{
                display: 'inline-block', background: card.bg, color: card.color,
                borderRadius: '8px', padding: '4px 14px',
                fontSize: '26px', fontWeight: '700',
              }}>
                {card.value}
              </span>
            </div>
          ))}
        </div>

        {/* ── Employee table */}
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{
            padding: '1rem 1.5rem', borderBottom: '1px solid #eee',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#333' }}>
              Employee Attendance — Today
            </h3>
            <span style={{ fontSize: '13px', color: '#aaa' }}>{totalEmployees} employees</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['Name', 'Department', 'Status', 'Check In', 'Check Out', 'Total Hours'].map(h => (
                    <th key={h} style={{
                      padding: '11px 16px', textAlign: 'left',
                      fontSize: '11px', fontWeight: '700', color: '#999',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
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
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#bbb', fontSize: '14px' }}>
                      No employees yet. Click "+ Add Employee" to get started.
                    </td>
                  </tr>
                )}
                {employees.map((emp, idx) => {
                  const att    = attendanceMap[emp.id]
                  const status = getStatus(emp)
                  const chip   = statusChip(status)
                  return (
                    <tr
                      key={emp.id}
                      style={{
                        borderBottom: idx < employees.length - 1 ? '1px solid #f5f5f5' : 'none',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '13px 16px', fontSize: '14px', fontWeight: '500', color: '#1a1a1a' }}>
                        {emp.full_name || '—'}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: '13px', color: '#777' }}>
                        {emp.department || '—'}
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{
                          ...chip,
                          display: 'inline-block', borderRadius: '20px',
                          padding: '3px 12px', fontSize: '12px', fontWeight: '600',
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
                      <td style={{ padding: '13px 16px', fontSize: '14px', fontWeight: att?.total_hours ? '600' : '400', color: att?.total_hours ? '#1D9E75' : '#ccc' }}>
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
