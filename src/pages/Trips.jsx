import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { logAdminAction } from '../lib/audit'

const STATUS_TABS = ['all', 'pending', 'accepted', 'loading', 'in_transit', 'delivered', 'cancelled']

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


  return (
    <div>
      <header className="page-header">
        <h1>Trips</h1>
        <p>Search and view every booking.</p>
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
