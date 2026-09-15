import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Payouts() {
  const { isFinance } = useAuth()
  const [rows, setRows] = useState([])
  const [filter, setFilter] = useState('pending')
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [filter])

  async function load() {
    setLoading(true)
    let query = supabase
      .from('bookings')
      .select('id, created_at, delivered_at, vehicle_name, total_fare, commission_amount, driver_payout, payout_status, paystack_reference, driver_id')
      .eq('status', 'delivered')
      .order('delivered_at', { ascending: false })
      .limit(100)
    if (filter !== 'all') query = query.eq('payout_status', filter)
    const { data, error } = await query
    if (error) console.error(error)
    setRows(data || [])
    setLoading(false)
  }

  async function markStatus(id, status) {
    const { error } = await supabase.from('bookings').update({ payout_status: status }).eq('id', id)
    if (error) return alert(error.message)
    load()
  }

  return (
    <div>
      <header className="page-header">
        <h1>Payouts</h1>
        <p>Delivered trips and their driver payout status. Commission is computed automatically on delivery — this view is for reconciling actual Paystack payouts.</p>
      </header>

      <div className="filter-tabs">
        {['pending', 'paid', 'failed', 'all'].map(f => (
          <button key={f} className={'filter-tab' + (filter === f ? ' active' : '')} onClick={() => setFilter(f)}>
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="page-loading">Loading…</div>
      ) : rows.length === 0 ? (
        <p className="empty-state">No delivered trips in this category yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Delivered</th><th>Vehicle</th><th>Total fare</th><th>Commission</th><th>Driver payout</th><th>Paystack ref</th><th>Status</th>{isFinance && <th></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                <td className="mono">{row.delivered_at ? new Date(row.delivered_at).toLocaleDateString() : '—'}</td>
                <td>{row.vehicle_name}</td>
                <td className="mono">R{row.total_fare}</td>
                <td className="mono">R{row.commission_amount ?? '—'}</td>
                <td className="mono">R{row.driver_payout ?? '—'}</td>
                <td className="mono small">{row.paystack_reference || '—'}</td>
                <td><span className={'badge badge-' + row.payout_status}>{row.payout_status}</span></td>
                {isFinance && row.payout_status === 'pending' && (
                  <td className="row-actions">
                    <button className="btn-small" onClick={() => markStatus(row.id, 'paid')}>Mark paid</button>
                    <button className="btn-small btn-danger" onClick={() => markStatus(row.id, 'failed')}>Mark failed</button>
                  </td>
                )}
                {isFinance && row.payout_status !== 'pending' && <td></td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
