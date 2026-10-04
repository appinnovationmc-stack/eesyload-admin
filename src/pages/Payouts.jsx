import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const money = n => (n === null || n === undefined ? '—' : 'R' + Number(n).toFixed(2))
const badgeFor = s => (s === 'approved' ? 'pending' : s === 'rejected' ? 'failed' : s)
const payable = row => row.paystack_verified === true && row.payment_method !== 'cash'

export default function Payouts() {
  const { isFinance } = useAuth()
  const [rows, setRows] = useState([])
  const [requests, setRequests] = useState([])
  const [drivers, setDrivers] = useState({})
  const [openDrivers, setOpenDrivers] = useState(new Set())
  const [filter, setFilter] = useState('pending')
  const [reqFilter, setReqFilter] = useState('open')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)

  useEffect(() => { loadAll() }, [filter, reqFilter])

  async function loadAll() {
    setLoading(true)

    let rq = supabase
      .from('payout_requests')
      .select('id, driver_id, status, amount, requested_at, decided_at')
      .order('requested_at', { ascending: false })
      .limit(100)
    if (reqFilter === 'open') rq = rq.in('status', ['pending', 'approved'])
    else if (reqFilter !== 'all') rq = rq.eq('status', reqFilter)

    let tq = supabase
      .from('bookings')
      .select('id, delivered_at, vehicle_name, total_fare, commission_amount, driver_payout, payout_status, paystack_reference, paystack_verified, payment_method, driver_id')
      .eq('status', 'delivered')
      .order('delivered_at', { ascending: false })
      .limit(100)
    if (filter !== 'all') tq = tq.eq('payout_status', filter)

    const [r1, r2, r3] = await Promise.all([
      rq,
      tq,
      supabase.from('payout_requests').select('driver_id').in('status', ['pending', 'approved']),
    ])
    if (r1.error) console.error(r1.error)
    if (r2.error) console.error(r2.error)

    const reqs = r1.data || []
    const trips = r2.data || []
    const ids = [...new Set([...reqs, ...trips].map(r => r.driver_id).filter(Boolean))]
    const map = {}
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name, phone').in('id', ids)
      for (const p of profs || []) map[p.id] = p
    }

    setOpenDrivers(new Set((r3.data || []).map(o => o.driver_id)))
    setDrivers(map)
    setRequests(reqs)
    setRows(trips)
    setLoading(false)
  }

  function driverLabel(id) {
    const p = drivers[id]
    if (!p) return 'Unknown driver'
    return (p.full_name || 'Unnamed') + (p.phone ? ' · ' + p.phone : '')
  }

  async function decide(req, action) {
    const verb = { approve: 'Approve', reject: 'Reject', pay: 'Mark as PAID' }[action]
    const warn = action === 'pay' ? '\n\nOnly confirm after the money has actually been sent.' : ''
    if (!window.confirm(verb + ' ' + money(req.amount) + ' for ' + driverLabel(req.driver_id) + '?' + warn)) return
    setBusy(req.id)
    const { error } = await supabase.rpc('decide_payout_request', { p_request_id: req.id, p_action: action })
    setBusy(null)
    if (error) return alert(error.message)
    loadAll()
  }

  async function markStatus(row, status) {
    if (!window.confirm('Mark this ' + money(row.driver_payout) + ' trip payout as ' + status + '?')) return
    const { error } = await supabase.from('bookings').update({ payout_status: status }).eq('id', row.id)
    if (error) return alert(error.message)
    loadAll()
  }

  function tripActions(row) {
    if (!isFinance) return null
    if (row.payout_status !== 'pending') return <td></td>
    if (!payable(row)) {
      return <td className="small">{row.payment_method === 'cash' ? 'Cash trip — not payable' : 'Payment not verified'}</td>
    }
    if (openDrivers.has(row.driver_id)) {
      return <td className="small">Use payout request</td>
    }
    return (
      <td className="row-actions">
        <button className="btn-small" onClick={() => markStatus(row, 'paid')}>Mark paid</button>
        <button className="btn-small btn-danger" onClick={() => markStatus(row, 'failed')}>Mark failed</button>
      </td>
    )
  }

  return (
    <div>
      <header className="page-header">
        <h1>Payouts</h1>
        <p>Driver cash-out requests and delivered trips. Only Paystack-verified card trips are payable. Mark a request paid only after the money has been sent.</p>
      </header>

      <h2>Payout requests</h2>
      <div className="filter-tabs">
        {['open', 'paid', 'rejected', 'all'].map(f => (
          <button key={f} className={'filter-tab' + (reqFilter === f ? ' active' : '')} onClick={() => setReqFilter(f)}>
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="page-loading">Loading…</div>
      ) : requests.length === 0 ? (
        <p className="empty-state">No payout requests in this category.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Requested</th><th>Driver</th><th>Amount</th><th>Status</th>{isFinance && <th></th>}
            </tr>
          </thead>
          <tbody>
            {requests.map(req => (
              <tr key={req.id}>
                <td className="mono">{req.requested_at ? new Date(req.requested_at).toLocaleString() : '—'}</td>
                <td>{driverLabel(req.driver_id)}</td>
                <td className="mono">{money(req.amount)}</td>
                <td><span className={'badge badge-' + badgeFor(req.status)}>{req.status}</span></td>
                {isFinance && (
                  <td className="row-actions">
                    {req.status === 'pending' && (
                      <button className="btn-small" disabled={busy === req.id} onClick={() => decide(req, 'approve')}>Approve</button>
                    )}
                    {(req.status === 'pending' || req.status === 'approved') && (
                      <button className="btn-small" disabled={busy === req.id} onClick={() => decide(req, 'pay')}>Mark paid</button>
                    )}
                    {(req.status === 'pending' || req.status === 'approved') && (
                      <button className="btn-small btn-danger" disabled={busy === req.id} onClick={() => decide(req, 'reject')}>Reject</button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 style={{ marginTop: 32 }}>Delivered trips</h2>
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
              <th>Delivered</th><th>Driver</th><th>Vehicle</th><th>Total fare</th><th>Commission</th><th>Driver payout</th><th>Paystack ref</th><th>Status</th>{isFinance && <th></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                <td className="mono">{row.delivered_at ? new Date(row.delivered_at).toLocaleDateString() : '—'}</td>
                <td>{driverLabel(row.driver_id)}</td>
                <td>{row.vehicle_name}</td>
                <td className="mono">R{row.total_fare}</td>
                <td className="mono">R{row.commission_amount ?? '—'}</td>
                <td className="mono">R{row.driver_payout ?? '—'}</td>
                <td className="mono small">{row.paystack_reference || '—'}</td>
                <td><span className={'badge badge-' + row.payout_status}>{row.payout_status}</span></td>
                {tripActions(row)}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
