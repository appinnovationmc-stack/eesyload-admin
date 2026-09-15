import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { logAdminAction } from '../lib/audit'

const STATUS_TABS = ['all', 'pending', 'accepted', 'en_route', 'delivered', 'cancelled']

export default function Trips() {
  const { isFinance, adminUser } = useAuth()
  const [rows, setRows] = useState([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => { load() }, [filter])

  async function load() {
    setLoading(true)
    let query = supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(200)
    if (filter !== 'all') query = query.eq('status', filter)
    const { data, error } = await query
    if (error) console.error(error)
    setRows(data || [])
    setLoading(false)
  }

  const filtered = rows.filter(r => {
    if (!search.trim()) return true
    const s = search.toLowerCase()
    return (
      String(r.id).toLowerCase().includes(s) ||
      (r.vehicle_name || '').toLowerCase().includes(s) ||
      (r.pickup_address || '').toLowerCase().includes(s) ||
      (r.dropoff_address || '').toLowerCase().includes(s)
    )
  })

  async function overrideStatus(id, status) {
    if (!confirm(`Set booking status to "${status}"? This is a manual override.`)) return
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id)
    if (error) return alert(error.message)
    await logAdminAction({ adminId: adminUser?.id, action: 'booking_status_override', targetTable: 'bookings', targetId: id, detail: { status } })
    load()
    setSelected(null)
  }

  return (
    <div>
      <header className="page-header">
        <h1>Trips</h1>
        <p>Search and manage every booking. Manual status overrides are logged to the audit trail.</p>
      </header>

      <div className="filter-tabs">
        {STATUS_TABS.map(f => (
          <button key={f} className={'filter-tab' + (filter === f ? ' active' : '')} onClick={() => setFilter(f)}>
            {f.replaceAll('_', ' ')}
          </button>
        ))}
      </div>

      <input
        className="search-input"
        placeholder="Search by booking ID, vehicle, or address…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {loading ? (
        <div className="page-loading">Loading…</div>
      ) : filtered.length === 0 ? (
        <p className="empty-state">No bookings match.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th><th>Created</th><th>Vehicle</th><th>Fare</th><th>Status</th><th>Payout</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => (
              <>
                <tr key={row.id} className="clickable-row" onClick={() => setSelected(selected === row.id ? null : row.id)}>
                  <td className="mono small">{String(row.id).slice(0, 8)}</td>
                  <td className="mono">{row.created_at ? new Date(row.created_at).toLocaleString() : '—'}</td>
                  <td>{row.vehicle_name || '—'}</td>
                  <td className="mono">R{row.total_fare ?? '—'}</td>
                  <td><span className={'badge badge-' + row.status}>{(row.status || '').replaceAll('_', ' ')}</span></td>
                  <td>{row.payout_status ? <span className={'badge badge-' + row.payout_status}>{row.payout_status}</span> : '—'}</td>
                  <td className="chev">{selected === row.id ? '▲' : '▼'}</td>
                </tr>
                {selected === row.id && (
                  <tr key={row.id + '-d'}>
                    <td colSpan={7} className="detail-cell">
                      <div className="driver-detail">
                        <div className="kv-grid">
                          {Object.entries(row).map(([k, v]) => (
                            <div key={k} className="kv-row">
                              <span className="kv-k">{k}</span>
                              <span className="kv-v mono">{v === null ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                            </div>
                          ))}
                        </div>
                        {isFinance && (
                          <div className="driver-detail-actions" style={{ marginTop: 14 }}>
                            <span className="detail-label">Override status:</span>
                            {['pending', 'accepted', 'en_route', 'delivered', 'cancelled'].map(s => (
                              <button key={s} className="btn-small" disabled={row.status === s} onClick={() => overrideStatus(row.id, s)}>
                                {s.replaceAll('_', ' ')}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
