import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const TABS = ['open', 'resolved', 'all']

export default function SosAlerts() {
  const { adminUser } = useAuth()
  const [rows, setRows] = useState([])
  const [people, setPeople] = useState({})
  const [filter, setFilter] = useState('open')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    load()
    const t = setInterval(load, 20000)
    return () => clearInterval(t)
  }, [filter])

  useEffect(() => {
    const ch = supabase
      .channel('sos_alerts_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sos_alerts' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [filter])

  async function load() {
    let q = supabase
      .from('sos_alerts')
      .select('id, rider_id, booking_id, lat, lng, location_error, created_at, resolved_at, resolved_by')
      .order('created_at', { ascending: false })
      .limit(200)
    if (filter === 'open') q = q.is('resolved_at', null)
    else if (filter === 'resolved') q = q.not('resolved_at', 'is', null)
    const { data, error } = await q
    if (error) console.error(error)
    const list = data || []

    const ids = [...new Set(list.map(r => r.rider_id).filter(Boolean))]
    const map = {}
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name, phone, role').in('id', ids)
      for (const p of profs || []) map[p.id] = p
    }
    setPeople(map)
    setRows(list)
    setLoading(false)
  }

  async function resolve(row) {
    if (!window.confirm('Mark this SOS alert as resolved? Only do this once the person is confirmed safe.')) return
    setBusy(row.id)
    const { error } = await supabase
      .from('sos_alerts')
      .update({ resolved_at: new Date().toISOString(), resolved_by: adminUser?.id })
      .eq('id', row.id)
    setBusy(null)
    if (error) return alert(error.message)
    load()
  }

  return (
    <div>
      <header className="page-header">
        <h1>SOS Alerts</h1>
        <p>Safety alerts raised from the rider app. Call the person first, then mark resolved. Open alerts also show a red count in the sidebar.</p>
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
        <p className="empty-state">No alerts in this category.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Raised</th><th>Person</th><th>Phone</th><th>Location</th><th>Booking</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const p = people[r.rider_id]
              return (
                <tr key={r.id}>
                  <td className="mono">{new Date(r.created_at).toLocaleString()}</td>
                  <td>{p?.full_name || 'Unknown'}{p?.role ? <span style={{ color: 'var(--text-dim)', fontSize: 12 }}> · {p.role}</span> : null}</td>
                  <td className="mono">{p?.phone ? <a href={'tel:+' + String(p.phone).replace(/^\+/, '')}>{p.phone}</a> : '—'}</td>
                  <td className="mono small">
                    {r.lat != null && r.lng != null ? (
                      <a href={`https://www.google.com/maps?q=${r.lat},${r.lng}`} target="_blank" rel="noreferrer">
                        {Number(r.lat).toFixed(4)}, {Number(r.lng).toFixed(4)}
                      </a>
                    ) : r.location_error ? 'Location unavailable' : '—'}
                  </td>
                  <td className="mono small">{r.booking_id ? String(r.booking_id).slice(0, 8) : '—'}</td>
                  <td>
                    <span className={'badge ' + (r.resolved_at ? 'badge-resolved' : 'badge-failed')}>
                      {r.resolved_at ? 'Resolved' : 'Open'}
                    </span>
                  </td>
                  <td className="row-actions">
                    {!r.resolved_at && (
                      <button className="btn-small btn-approve" disabled={busy === r.id} onClick={() => resolve(r)}>Resolve</button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
