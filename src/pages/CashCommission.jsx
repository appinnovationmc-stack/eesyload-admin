import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const money = n => 'R' + Number(n || 0).toFixed(2)

export default function CashCommission() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('driver_cash_commission_owed')
        .select('*')
        .order('commission_owed', { ascending: false })
      if (error) setError(error.message)
      setRows(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const totalOwed = rows.reduce((s, r) => s + Number(r.commission_owed || 0), 0)
  const totalCash = rows.reduce((s, r) => s + Number(r.cash_collected_by_driver || 0), 0)
  const totalTrips = rows.reduce((s, r) => s + Number(r.cash_trips || 0), 0)

  return (
    <div>
      <header className="page-header">
        <h1>Cash Commission</h1>
        <p>Drivers collect cash fares directly, so the platform commission on those trips is owed back to EesyLoad. Figures cover every delivered cash trip to date.</p>
      </header>

      <div className="notice">
        There is no settlement tracking yet: totals do not go down when a driver pays you back. Record settlements outside this page until a settlement flow is added.
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="stat-grid">
        <div className="stat-card"><div className="stat-label">Commission owed</div><div className="stat-value mono">{money(totalOwed)}</div></div>
        <div className="stat-card"><div className="stat-label">Cash collected by drivers</div><div className="stat-value mono">{money(totalCash)}</div></div>
        <div className="stat-card"><div className="stat-label">Cash trips</div><div className="stat-value mono">{totalTrips}</div></div>
      </div>

      {loading ? (
        <div className="page-loading">Loading…</div>
      ) : rows.length === 0 ? (
        <p className="empty-state">No delivered cash trips yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Driver</th><th>Phone</th><th>Cash trips</th><th>Cash collected</th><th>Commission owed</th><th>Oldest trip</th><th>Latest trip</th></tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.driver_id}>
                <td>{r.driver_name || 'Unnamed driver'}</td>
                <td className="mono">{r.driver_phone || '—'}</td>
                <td className="mono">{r.cash_trips}</td>
                <td className="mono">{money(r.cash_collected_by_driver)}</td>
                <td className="mono">{money(r.commission_owed)}</td>
                <td className="mono">{r.oldest_unsettled_trip ? new Date(r.oldest_unsettled_trip).toLocaleDateString() : '—'}</td>
                <td className="mono">{r.latest_trip ? new Date(r.latest_trip).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
