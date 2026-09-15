import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function CommissionRules() {
  const { isFinance } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('vehicle_types')
      .select('id, name, commission_percent, min_commission')
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
        commission_percent: Number(row.commission_percent),
        min_commission: Number(row.min_commission),
      })
      .eq('id', row.id)
    setSavingId(null)
    if (error) alert(error.message)
  }

  return (
    <div>
      <header className="page-header">
        <h1>Commission</h1>
        <p>Platform's cut per vehicle type. Applied automatically when a booking's status flips to "delivered" — see the trigger in schema.sql.</p>
      </header>

      {!isFinance && <div className="notice">Read-only — only finance and owner can edit commission rules.</div>}

      {loading ? (
        <div className="page-loading">Loading…</div>
      ) : (
        <table className="data-table editable-table">
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Commission %</th>
              <th>Minimum commission (R)</th>
              {isFinance && <th></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>
                  <input type="number" step="0.1" className="cell-input mono" value={row.commission_percent}
                    disabled={!isFinance} onChange={e => updateField(row.id, 'commission_percent', e.target.value)} />
                </td>
                <td>
                  <input type="number" step="0.5" className="cell-input mono" value={row.min_commission}
                    disabled={!isFinance} onChange={e => updateField(row.id, 'min_commission', e.target.value)} />
                </td>
                {isFinance && (
                  <td>
                    <button className="btn-small" onClick={() => saveRow(row)} disabled={savingId === row.id}>
                      {savingId === row.id ? '…' : 'Save'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
