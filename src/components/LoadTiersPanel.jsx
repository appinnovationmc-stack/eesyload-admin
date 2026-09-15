import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoadTiersPanel() {
  const [tiers, setTiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => { loadTiers() }, [])

  async function loadTiers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('load_tiers')
      .select('*')
      .order('sort_order')
    if (error) setError(error.message)
    else setTiers(data)
    setLoading(false)
  }

  function updateField(id, field, value) {
    setTiers(tiers.map(t => t.id === id ? { ...t, [field]: value } : t))
  }

  async function saveTier(tier) {
    setSavingId(tier.id)
    setError('')
    const { error } = await supabase
      .from('load_tiers')
      .update({
        min_weight_kg: tier.min_weight_kg,
        max_weight_kg: tier.max_weight_kg,
        surcharge_amount: tier.surcharge_amount,
        active: tier.active,
      })
      .eq('id', tier.id)
    if (error) setError(error.message)
    setSavingId(null)
  }

  if (loading) return <div className="page-loading">Loading load tiers…</div>

  return (
    <div className="panel">
      <h2>Load Weight Tiers</h2>
      <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: -8, marginBottom: 14 }}>
        Flat surcharge added to the fare based on load weight. Applied automatically
        when a booking's weight is recorded.
      </p>
      {error && <div className="form-error">{error}</div>}
      <table className="data-table">
        <thead>
          <tr>
            <th>Tier</th>
            <th>Min (kg)</th>
            <th>Max (kg)</th>
            <th>Surcharge (R)</th>
            <th>Active</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {tiers.map(tier => (
            <tr key={tier.id}>
              <td className="capitalize">{tier.name}</td>
              <td>
                <input
                  className="cell-input"
                  type="number"
                  value={tier.min_weight_kg}
                  onChange={e => updateField(tier.id, 'min_weight_kg', parseFloat(e.target.value))}
                />
              </td>
              <td>
                <input
                  className="cell-input"
                  type="number"
                  placeholder="no limit"
                  value={tier.max_weight_kg ?? ''}
                  onChange={e => updateField(tier.id, 'max_weight_kg', e.target.value === '' ? null : parseFloat(e.target.value))}
                />
              </td>
              <td>
                <input
                  className="cell-input"
                  type="number"
                  value={tier.surcharge_amount}
                  onChange={e => updateField(tier.id, 'surcharge_amount', parseFloat(e.target.value))}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={tier.active}
                  onChange={e => updateField(tier.id, 'active', e.target.checked)}
                />
              </td>
              <td>
                <button
                  className="btn-small"
                  disabled={savingId === tier.id}
                  onClick={() => saveTier(tier)}
                >
                  {savingId === tier.id ? 'Saving…' : 'Save'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
