import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const FIELDS = [
  { key: 'offer_seconds', label: 'Offer window (seconds)', hint: 'How long one driver has to accept before the offer moves on. 5–120.', min: 5, max: 120, step: 1 },
  { key: 'max_attempts', label: 'Max drivers tried', hint: 'Sequential mode only. 1–10.', min: 1, max: 10, step: 1 },
  { key: 'max_radius_km', label: 'Max pickup radius (km)', hint: 'Drivers farther than this never see the job.', min: 1, step: 1 },
  { key: 'location_fresh_minutes', label: 'Location freshness (minutes)', hint: "A driver's last GPS ping must be newer than this.", min: 1, step: 1 },
  { key: 'avg_speed_kmh', label: 'Average speed (km/h)', hint: 'Used to estimate pickup ETA.', min: 1, step: 1 },
  { key: 'road_factor', label: 'Road factor', hint: 'Straight-line distance multiplier for road distance. Minimum 1.', min: 1, step: 0.05 },
]

export default function Dispatch() {
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_dispatch_settings')
    if (error) setStatus({ type: 'error', message: error.message })
    else setForm(data)
    setLoading(false)
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setStatus(null)
    const { data, error } = await supabase.rpc('update_dispatch_settings', {
      p_mode: form.mode,
      p_offer_seconds: Number(form.offer_seconds),
      p_max_attempts: Number(form.max_attempts),
      p_max_radius_km: Number(form.max_radius_km),
      p_location_fresh_minutes: Number(form.location_fresh_minutes),
      p_avg_speed_kmh: Number(form.avg_speed_kmh),
      p_road_factor: Number(form.road_factor),
    })
    setSaving(false)
    if (error) return setStatus({ type: 'error', message: error.message })
    setForm(data)
    setStatus({ type: 'success', message: 'Dispatch settings saved. New bookings use them immediately.' })
  }

  return (
    <div>
      <header className="page-header">
        <h1>Dispatch</h1>
        <p>How new jobs are offered to drivers. Owner only; every change is written to the audit log.</p>
      </header>

      {status && <div className={status.type === 'error' ? 'form-error' : 'notice'}>{status.message}</div>}

      {loading ? (
        <div className="page-loading">Loading…</div>
      ) : !form ? null : (
        <form className="panel form-panel" onSubmit={save}>
          <label className="field" style={{ marginBottom: 16 }}>
            <span>Mode</span>
            <select value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value })}>
              <option value="open">Open — every eligible nearby driver sees the job and the first to accept wins</option>
              <option value="sequential">Sequential — offer to the closest driver first, then the next</option>
            </select>
          </label>
          <div className="form-row">
            {FIELDS.map(f => (
              <label className="field" key={f.key}>
                <span>{f.label}</span>
                <input type="number" min={f.min} max={f.max} step={f.step} value={form[f.key]}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })} required />
                <small style={{ color: 'var(--text-dim)', fontSize: 12 }}>{f.hint}</small>
              </label>
            ))}
          </div>
          <button className="btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save dispatch settings'}</button>
        </form>
      )}
    </div>
  )
}
