import { Fragment, useEffect, useState } from 'react'
import { vehicleLabel } from '../vehicleLabel'
import { supabase } from '../lib/supabase'

const CANCELLED = ['cancelled_rider', 'cancelled_driver', 'cancelled_customer']
const STATUS_TABS = ['all', 'pending', 'accepted', 'loading', 'in_transit', 'delivered', 'cancelled']

export default function Trips() {
  const [rows, setRows] = useState([])
  const [people, setPeople] = useState({})
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState({})

  useEffect(() => { load() }, [filter])

  async function load() {
    setLoading(true)
    let query = supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(200)
    if (filter === 'cancelled') query = query.in('status', CANCELLED)
    else if (filter !== 'all') query = query.eq('status', filter)
    const { data, error } = await query
    if (error) console.error(error)
    const list = data || []

    const ids = [...new Set(list.flatMap(r => [r.rider_id, r.driver_id]).filter(Boolean))]
    const map = {}
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name, phone').in('id', ids)
      for (const p of profs || []) map[p.id] = p
    }
    setPeople(map)
    setRows(list)
    setLoading(false)
  }

  async function toggle(row) {
    if (selected === row.id) { setSelected(null); return }
    setSelected(row.id)
    if (messages[row.id]) return
    const { data, error } = await supabase
      .from('booking_messages')
      .select('id, sender_role, channel, body, created_at')
      .eq('booking_id', row.id)
      .order('created_at', { ascending: true })
    if (error) console.error(error)
    setMessages(m => ({ ...m, [row.id]: data || [] }))
  }

  const name = id => (id ? people[id]?.full_name || people[id]?.phone || String(id).slice(0, 8) : '—')

  const filtered = rows.filter(r => {
    if (!search.trim()) return true
    const s = search.toLowerCase()
    return (
      String(r.id).toLowerCase().includes(s) ||
      (r.vehicle_name || '').toLowerCase().includes(s) ||
      (r.pickup_address || '').toLowerCase().includes(s) ||
      (r.dropoff_address || '').toLowerCase().includes(s) ||
      (r.customer_name || '').toLowerCase().includes(s) ||
      (r.customer_phone || '').toLowerCase().includes(s) ||
      name(r.rider_id).toLowerCase().includes(s) ||
      name(r.driver_id).toLowerCase().includes(s)
    )
  })

  return (
    <div>
      <header className="page-header">
        <h1>Trips</h1>
        <p>Search and view every booking, including the in-trip chat.</p>
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
        placeholder="Search by booking ID, name, vehicle, or address…"
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
              <th>ID</th><th>Created</th><th>Rider</th><th>Driver</th><th>Vehicle</th><th>Fare</th><th>Paid by</th><th>Status</th><th>Payout</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => (
              <Fragment key={row.id}>
                <tr className="clickable-row" onClick={() => toggle(row)}>
                  <td className="mono small">{String(row.id).slice(0, 8)}</td>
                  <td className="mono">{row.created_at ? new Date(row.created_at).toLocaleString() : '—'}</td>
                  <td>{row.is_agent_booking ? (row.customer_name || 'Agent customer') : name(row.rider_id)}</td>
                  <td>{name(row.driver_id)}</td>
                  <td>{vehicleLabel(row.vehicle_name)}</td>
                  <td className="mono">R{row.total_fare ?? '—'}</td>
                  <td className="capitalize">{(row.payment_method || '—').replaceAll('_', ' ')}</td>
                  <td><span className={'badge badge-' + row.status}>{(row.status || '').replaceAll('_', ' ')}</span></td>
                  <td>{row.payout_status ? <span className={'badge badge-' + row.payout_status}>{row.payout_status}</span> : '—'}</td>
                  <td className="chev">{selected === row.id ? '▲' : '▼'}</td>
                </tr>
                {selected === row.id && (
                  <tr>
                    <td colSpan={10} className="detail-cell">
                      <div className="driver-detail">
                        <div className="detail-label">Messages</div>
                        {!messages[row.id] ? (
                          <p className="empty-state">Loading…</p>
                        ) : messages[row.id].length === 0 ? (
                          <p className="empty-state">No messages on this trip.</p>
                        ) : (
                          <div className="kv-grid" style={{ gridTemplateColumns: '1fr' }}>
                            {messages[row.id].map(m => (
                              <div key={m.id} className="kv-row">
                                <span className="kv-k">
                                  {m.sender_role}{m.channel && m.channel !== 'app' ? ' · ' + m.channel : ''} · {new Date(m.created_at).toLocaleTimeString()}
                                </span>
                                <span className="kv-v">{m.body}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="detail-label" style={{ marginTop: 14 }}>All fields</div>
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
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
