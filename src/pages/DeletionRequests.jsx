import { Fragment, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const TABS = ['pending', 'confirmed', 'completed', 'rejected', 'all']

export default function DeletionRequests() {
  const { isFinance } = useAuth()
  const [rows, setRows] = useState([])
  const [filter, setFilter] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState(null)
  const [match, setMatch] = useState(null)
  const [notes, setNotes] = useState({})
  const [busy, setBusy] = useState(null)

  useEffect(() => { load() }, [filter])

  async function load() {
    setLoading(true)
    let q = supabase.from('account_deletion_requests').select('*').order('created_at', { ascending: false }).limit(200)
    if (filter !== 'all') q = q.eq('status', filter)
    const { data, error } = await q
    if (error) console.error(error)
    setRows(data || [])
    setLoading(false)
  }

  async function toggle(row) {
    if (openId === row.id) { setOpenId(null); return }
    setOpenId(row.id)
    setMatch(null)
    setNotes(n => ({ ...n, [row.id]: n[row.id] ?? row.admin_notes ?? '' }))
    const digits = String(row.phone || '').replace(/\D/g, '')
    const tail = digits.slice(-9)
    if (tail.length === 9) {
      const { data } = await supabase.from('profiles').select('id, full_name, phone, role, driver_status, created_at').ilike('phone', '%' + tail).limit(5)
      setMatch(data || [])
    } else {
      setMatch([])
    }
  }

  async function setStatus(row, status) {
    const msg = {
      confirmed: 'Confirm that you verified this request really comes from the account owner?',
      completed: 'Mark COMPLETED only after the account and its personal data have been deleted. Continue?',
      rejected: 'Reject this request?',
    }[status]
    if (!window.confirm(msg)) return
    setBusy(row.id)
    const patch = { status, admin_notes: (notes[row.id] ?? row.admin_notes ?? '') || null }
    if (status === 'confirmed') patch.confirmed_at = new Date().toISOString()
    if (status === 'completed') patch.completed_at = new Date().toISOString()
    const { error } = await supabase.from('account_deletion_requests').update(patch).eq('id', row.id)
    setBusy(null)
    if (error) return alert(error.message)
    load()
  }

  async function saveNotes(row) {
    setBusy(row.id)
    const { error } = await supabase.from('account_deletion_requests').update({ admin_notes: notes[row.id] || null }).eq('id', row.id)
    setBusy(null)
    if (error) return alert(error.message)
    load()
  }

  return (
    <div>
      <header className="page-header">
        <h1>Deletion Requests</h1>
        <p>Requests submitted from <span className="mono">admin.eesyload.com/delete-account.html</span>. Verify the person, delete their account and personal data, then mark completed. Target: confirm within 48 hours, delete within 14 days.</p>
      </header>

      <div className="filter-tabs">
        {TABS.map(f => (
          <button key={f} className={'filter-tab' + (filter === f ? ' active' : '')} onClick={() => setFilter(f)}>
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="page-loading">Loading…</div>
      ) : rows.length === 0 ? (
        <p className="empty-state">No requests in this category.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Submitted</th><th>Phone</th><th>Email</th><th>Status</th><th>Age</th></tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const ageDays = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000)
              const overdue = (r.status === 'pending' && ageDays >= 2) || (r.status === 'confirmed' && ageDays >= 14)
              return (
                <Fragment key={r.id}>
                  <tr className="clickable-row" onClick={() => toggle(r)}>
                    <td className="mono">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="mono">{r.phone}</td>
                    <td>{r.email || '—'}</td>
                    <td><span className={'badge badge-' + r.status}>{r.status}</span></td>
                    <td className="mono">
                      {ageDays}d{overdue && <span className="badge badge-failed" style={{ marginLeft: 6 }}>Overdue</span>}
                    </td>
                  </tr>
                  {openId === r.id && (
                    <tr>
                      <td colSpan={5} className="detail-cell">
                        <div className="driver-detail">
                          {r.reason && (
                            <>
                              <div className="detail-label">Reason given</div>
                              <p style={{ marginTop: 4 }}>{r.reason}</p>
                            </>
                          )}

                          <div className="detail-label" style={{ marginTop: 10 }}>Matching profile</div>
                          {match === null ? (
                            <p className="empty-state">Looking up…</p>
                          ) : match.length === 0 ? (
                            <p className="empty-state">No profile with this phone number — the request may use a different number.</p>
                          ) : (
                            <div className="kv-grid">
                              {match.map(m => (
                                <div key={m.id} className="kv-row">
                                  <span className="kv-k">{m.full_name || 'Unnamed'} · {m.role}</span>
                                  <span className="kv-v mono small">{m.id}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="detail-label" style={{ marginTop: 10 }}>Admin notes</div>
                          <textarea
                            className="cell-input"
                            style={{ width: '100%', minHeight: 64 }}
                            value={notes[r.id] ?? ''}
                            disabled={!isFinance}
                            onChange={e => setNotes(n => ({ ...n, [r.id]: e.target.value }))}
                            placeholder="What you verified, what was deleted, when…"
                          />

                          {isFinance && (
                            <div className="driver-detail-actions" style={{ marginTop: 10 }}>
                              <button className="btn-small" disabled={busy === r.id} onClick={() => saveNotes(r)}>Save notes</button>
                              {r.status === 'pending' && (
                                <button className="btn-small btn-approve" disabled={busy === r.id} onClick={() => setStatus(r, 'confirmed')}>Confirm identity</button>
                              )}
                              {(r.status === 'pending' || r.status === 'confirmed') && (
                                <button className="btn-small btn-approve" disabled={busy === r.id} onClick={() => setStatus(r, 'completed')}>Mark completed</button>
                              )}
                              {(r.status === 'pending' || r.status === 'confirmed') && (
                                <button className="btn-small btn-danger" disabled={busy === r.id} onClick={() => setStatus(r, 'rejected')}>Reject</button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
