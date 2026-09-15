import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '../lib/supabase'

// Default center: Johannesburg, SA — adjust if your fleet operates elsewhere
const DEFAULT_CENTER = [-26.2041, 28.0473]

function markerIcon(online) {
  const color = online ? '#06C167' : '#8E8E93'
  return L.divIcon({
    className: 'driver-marker-wrap',
    html: `<div class="driver-marker" style="background:${color}"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

export default function LiveOps() {
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [onlyOnline, setOnlyOnline] = useState(true)
  const channelRef = useRef(null)

  useEffect(() => {
    load()
    channelRef.current = supabase
      .channel('driver_locations_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_locations' }, payload => {
        setDrivers(prev => {
          const row = payload.new
          if (!row) return prev
          const idx = prev.findIndex(d => d.driver_id === row.driver_id)
          if (idx === -1) return prev // new driver location without profile info yet — next full load() will pick it up
          const updated = [...prev]
          updated[idx] = { ...updated[idx], lat: row.lat, lng: row.lng, heading: row.heading, updated_at: row.updated_at }
          return updated
        })
      })
      .subscribe()

    const interval = setInterval(load, 30000) // full resync every 30s as a safety net
    return () => {
      supabase.removeChannel(channelRef.current)
      clearInterval(interval)
    }
  }, [])

  async function load() {
    const { data: locations, error: locErr } = await supabase
      .from('driver_locations')
      .select('driver_id, lat, lng, heading, updated_at')
    if (locErr) { console.error(locErr); setLoading(false); return }

    const ids = (locations || []).map(l => l.driver_id)
    if (ids.length === 0) { setDrivers([]); setLoading(false); return }

    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, full_name, vehicle_type, vehicle_plate, is_online, driver_status')
      .in('id', ids)
    if (profErr) console.error(profErr)

    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
    const merged = (locations || []).map(l => ({ ...l, ...profileMap[l.driver_id] }))
    setDrivers(merged)
    setLoading(false)
  }

  const visible = useMemo(() => onlyOnline ? drivers.filter(d => d.is_online) : drivers, [drivers, onlyOnline])
  const onlineCount = drivers.filter(d => d.is_online).length

  return (
    <div>
      <header className="page-header">
        <h1>Live Ops</h1>
        <p>Real-time driver positions from <span className="mono">driver_locations</span>. Updates stream in live via Supabase Realtime.</p>
      </header>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Drivers online</div>
          <div className="stat-value mono">{onlineCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Reporting location</div>
          <div className="stat-value mono">{drivers.length}</div>
        </div>
      </div>

      <div className="filter-tabs">
        <button className={'filter-tab' + (onlyOnline ? ' active' : '')} onClick={() => setOnlyOnline(true)}>Online only</button>
        <button className={'filter-tab' + (!onlyOnline ? ' active' : '')} onClick={() => setOnlyOnline(false)}>All</button>
      </div>

      {loading ? (
        <div className="page-loading">Loading…</div>
      ) : (
        <div className="map-panel">
          <MapContainer center={DEFAULT_CENTER} zoom={11} style={{ height: '560px', width: '100%', borderRadius: 'var(--radius-lg)' }}>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {visible.map(d => (
              <Marker key={d.driver_id} position={[d.lat, d.lng]} icon={markerIcon(d.is_online)}>
                <Popup>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13 }}>
                    <strong>{d.full_name || 'Unnamed driver'}</strong><br />
                    {d.vehicle_type || '—'} {d.vehicle_plate ? `· ${d.vehicle_plate}` : ''}<br />
                    Status: {d.driver_status || '—'}<br />
                    {d.is_online ? 'Online' : 'Offline'}<br />
                    <span style={{ color: '#6C6C70' }}>
                      Updated {d.updated_at ? new Date(d.updated_at).toLocaleTimeString() : '—'}
                    </span>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {!loading && visible.length === 0 && (
        <p className="empty-state">No drivers currently reporting location{onlyOnline ? ' (try "All")' : ''}.</p>
      )}
    </div>
  )
}
