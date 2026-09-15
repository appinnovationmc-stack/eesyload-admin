import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import LoadTiersPanel from '../components/LoadTiersPanel'
import AddonsPanel from '../components/AddonsPanel'
export default function PricingConfig() {
  const { isFinance } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [savedId, setSavedId] = useState(null)
  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('vehicle_types')
      .select('id, name, capacity_label, base_price, per_km_rate, sort_order, active')
      .order('sort_order')
    if (error) console.error(error)
    setRows(data || [])
    setLoading(false)
  }
  function updateField(id, key, value) {
    setRows(rows.map(r => (r.id === id ? { ...r, [key]: value } : r)))
  }
  async function saveRow(row) {
    setSavingId(row.id)
    const { error } = await supabase
      .from('vehicle_types')
      .update({
        name: row.name,
        capacity_label: row.capacity_label,
        base_price: Number(row.base_price),
        per_km_rate: Number(row.per_km_rate),
        sort_order: Number(row.sort_order),
        active: row.active,
      })
      .eq('id', row.id)
    setSavingId(null)
    if (error) return alert(error.message)
    setSavedId(row.id)
    setTimeout(() => setSavedId(null), 1500)
  }
  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Pricing</h1>
          <p>Vehicle types shown on the rider booking screen. Changes go live immediately — the rider app reads this table directly. Fare = base price + (distance in km × per-km rate) + add-ons.</p>
        </div>
      </header>
      {!isFinance && <div className="notice">Read-only — only finance and owner roles can edit pricing.</div>}
      {loading ? (
        <div className="page-loading">Loading…</div>
      ) : rows.length === 0 ? (
        <p className="empty-state">No vehicle types found. Seed vehicle_types in Supabase first.</p>
      ) : (
        <table className="data-table editable-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Capacity label</th>
              <th>Base price (R)</th>
              <th>Per-km rate (R)</th>
              <th>Sort order</th>
              <th>Active</th>
              {isFinance && <th></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                <td>
                  <input className="cell-input" style={{ width: 140 }} value={row.name}
                    disabled={!isFinance} onChange={e => updateField(row.id, 'name', e.target.value)} />
                </td>
                <td>
                  <input className="cell-input" style={{ width: 120 }} value={row.capacity_label || ''}
                    disabled={!isFinance} onChange={e => updateField(row.id, 'capacity_label', e.target.value)} />
                </td>
                <td>
                  <input type="number" step="0.01" className="cell-input mono" value={row.base_price}
                    disabled={!isFinance} onChange={e => updateField(row.id, 'base_price', e.target.value)} />
                </td>
                <td>
                  <input type="number" step="0.01" className="cell-input mono" value={row.per_km_rate}
                    disabled={!isFinance} onChange={e => updateField(row.id, 'per_km_rate', e.target.value)} />
                </td>
                <td>
                  <input type="number" className="cell-input mono" style={{ width: 60 }} value={row.sort_order ?? 0}
                    disabled={!isFinance} onChange={e => updateField(row.id, 'sort_order', e.target.value)} />
                </td>
                <td>
                  <input type="checkbox" checked={row.active}
                    disabled={!isFinance} onChange={e => updateField(row.id, 'active', e.target.checked)} />
                </td>
                {isFinance && (
                  <td>
                    <button className="btn-small" onClick={() => saveRow(row)} disabled={savingId === row.id}>
                      {savingId === row.id ? '…' : savedId === row.id ? 'Saved ✓' : 'Save'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <LoadTiersPanel />
      <AddonsPanel />
    </div>
  )
}
