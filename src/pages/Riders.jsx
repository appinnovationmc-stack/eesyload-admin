import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Riders() {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => { if (search.trim()) doSearch(); else setResults([]) }, 350)
    return () => clearTimeout(t)
  }, [search])

  async function doSearch() {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, phone, avatar_url, role, driver_status, created_at')
      .or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`)
      .limit(50)
    if (error) console.error(error)
    setResults(data || [])
    setLoading(false)
  }

  async function viewHistory(user) {
    setSelected(user)
    setHistoryLoading(true)
    // Bookings don't have a documented rider_id column here, so we try common ones defensively.
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .or(`rider_id.eq.${user.id},user_id.eq.${user.id},customer_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) console.warn('history lookup — booking rider column may differ:', error.message)
    setHistory(data || [])
    setHistoryLoading(false)
  }

  return (
    <div>
      <header className="page-header">
        <h1>Users</h1>
        <p>Search riders and drivers by name or phone. Click a result to see their ride history.</p>
      </header>

      <input
        className="search-input"
        placeholder="Search by name or phone…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        autoFocus
      />

      {loading && <div className="page-loading">Searching…</div>}

      {!loading && search.trim() && results.length === 0 && (
        <p className="empty-state">No users found.</p>
      )}

      {results.length > 0 && (
        <table className="data-table">
          <thead>
            <tr><th></th><th>Name</th><th>Phone</th><th>Role</th><th>Joined</th></tr>
          </thead>
          <tbody>
            {results.map(u => (
              <tr key={u.id} className="clickable-row" onClick={() => viewHistory(u)}>
                <td>
                  <div className="avatar-sm">
                    {u.avatar_url ? <img src={u.avatar_url} alt="" /> : (u.full_name?.[0]?.toUpperCase() || '?')}
                  </div>
                </td>
                <td>{u.full_name || 'Unnamed'}</td>
                <td className="mono">{u.phone || '—'}</td>
                <td className="capitalize">{u.driver_status ? 'driver' : (u.role || 'rider')}</td>
                <td className="mono">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <section className="panel" style={{ marginTop: 20 }}>
          <h2>Ride history — {selected.full_name || selected.phone}</h2>
          {historyLoading ? (
            <div className="page-loading">Loading…</div>
          ) : history.length === 0 ? (
            <p className="empty-state">No bookings found for this user (or the rider-id column on bookings has a different name — tell me the exact column and I'll wire it up).</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Created</th><th>Vehicle</th><th>Fare</th><th>Status</th></tr>
              </thead>
              <tbody>
                {history.map(b => (
                  <tr key={b.id}>
                    <td className="mono">{b.created_at ? new Date(b.created_at).toLocaleString() : '—'}</td>
                    <td>{b.vehicle_name || '—'}</td>
                    <td className="mono">R{b.total_fare ?? '—'}</td>
                    <td><span className={'badge badge-' + b.status}>{b.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  )
}
