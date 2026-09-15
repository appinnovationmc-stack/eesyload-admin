import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [
        { count: pendingCount },
        { data: recent },
        { count: activeVehicleTypes },
        { count: onlineDrivers },
        { count: pendingDrivers },
        { data: last30 },
      ] = await Promise.all([
        supabase.from('bookings').select('id', { count: 'exact', head: true })
          .eq('status', 'delivered').eq('payout_status', 'pending'),
        supabase.from('bookings')
          .select('id, vehicle_name, total_fare, commission_amount, driver_payout, payout_status, status, created_at')
          .order('created_at', { ascending: false }).limit(6),
        supabase.from('vehicle_types').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_online', true),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('driver_status', 'pending_review'),
        supabase.from('bookings').select('created_at, total_fare, status')
          .gte('created_at', new Date(Date.now() - 29 * 86400000).toISOString()),
      ])

      // Build a 30-day trip/GMV series
      const byDay = {}
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000)
        const key = d.toISOString().slice(0, 10)
        byDay[key] = { date: key.slice(5), trips: 0, gmv: 0 }
      }
      let cancelled = 0
      ;(last30 || []).forEach(b => {
        const key = (b.created_at || '').slice(0, 10)
        if (byDay[key]) {
          byDay[key].trips += 1
          byDay[key].gmv += Number(b.total_fare || 0)
        }
        if (b.status === 'cancelled') cancelled += 1
      })
      const series = Object.values(byDay)
      const totalTrips30 = (last30 || []).length
      const cancellationRate = totalTrips30 ? ((cancelled / totalTrips30) * 100).toFixed(1) : '0.0'
      const gmv30 = (last30 || []).reduce((sum, b) => sum + Number(b.total_fare || 0), 0)

      setStats({
        pendingCount: pendingCount ?? 0,
        recent: recent ?? [],
        activeVehicleTypes: activeVehicleTypes ?? 0,
        onlineDrivers: onlineDrivers ?? 0,
        pendingDrivers: pendingDrivers ?? 0,
        series,
        totalTrips30,
        cancellationRate,
        gmv30,
      })
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div>
      <header className="page-header">
        <h1>Dashboard</h1>
        <p>Live snapshot from your production tables.</p>
      </header>

      {loading ? (
        <div className="page-loading">Loading…</div>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Drivers online</div>
              <div className="stat-value mono">{stats.onlineDrivers}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Pending driver approvals</div>
              <div className="stat-value mono">{stats.pendingDrivers}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Pending payouts</div>
              <div className="stat-value mono">{stats.pendingCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">GMV (30d)</div>
              <div className="stat-value mono">R{stats.gmv30.toFixed(0)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Trips (30d)</div>
              <div className="stat-value mono">{stats.totalTrips30}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Cancellation rate</div>
              <div className="stat-value mono">{stats.cancellationRate}%</div>
            </div>
          </div>

          <section className="panel">
            <h2>Trips &amp; GMV — last 30 days</h2>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={stats.series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6C6C70' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#6C6C70' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#6C6C70' }} />
                <Tooltip />
                <Line yAxisId="left" type="monotone" dataKey="trips" stroke="#BB2235" strokeWidth={2} dot={false} name="Trips" />
                <Line yAxisId="right" type="monotone" dataKey="gmv" stroke="#01649C" strokeWidth={2} dot={false} name="GMV (R)" />
              </LineChart>
            </ResponsiveContainer>
          </section>

          <section className="panel">
            <h2>Recent bookings</h2>
            {stats.recent.length === 0 ? (
              <p className="empty-state">No bookings yet.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Vehicle</th><th>Status</th><th>Fare</th><th>Commission</th><th>Driver payout</th><th>Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent.map(row => (
                    <tr key={row.id}>
                      <td>{row.vehicle_name}</td>
                      <td className="capitalize">{row.status}</td>
                      <td className="mono">R{row.total_fare}</td>
                      <td className="mono">{row.commission_amount != null ? `R${row.commission_amount}` : '—'}</td>
                      <td className="mono">{row.driver_payout != null ? `R${row.driver_payout}` : '—'}</td>
                      <td><span className={'badge badge-' + row.payout_status}>{row.payout_status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  )
}
