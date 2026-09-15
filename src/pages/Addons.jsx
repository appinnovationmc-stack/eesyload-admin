import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const EMPTY = { name: '', description: '', price: 0, sort_order: 0, active: true }

export default function Addons() {
  const { isFinance } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('addons').select('*').order('sort_order')
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
      .from('addons')
      .update({
        name: row.name,
        description: row.description,
        price: Number(row.price),
        sort_order: Number(row.sort_order),
        active: row.active,
      })
      .eq('id', row.id)
    setSavingId(null)
    if (error) alert(error.message)
  }

  async function createAddon(e) {
    e.preventDefault()
    const { error } = await supabase.from('addons').insert({
      ...form,
      price: Number(form.price),
      sort_order: Number(form.sort_order),
    })
    if (error) return alert(error.message)
    setForm(EMPTY)
    setShowForm(false)
    load()
  }

  async function removeAddon(id) {
    if (!confirm('Delete this add-on? It will disappear from the rider booking screen.')) return
    const { error } = await supabase.from('addons').delete().eq('id', id)
    if (error) return alert(error.message)
    load()
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Add-ons</h1>
          <p>Extras riders can toggle at booking (helper, insurance, etc). Read directly by the rider app.</p>
        </div>
        {isFinance && (
          <button className="btn-primary" onClick={() => setShowForm(s => !s)}>
            {showForm ? 'Cancel' : '+ New add-on'}
          </button>
        )}
      </header>

      {showForm && (
        <form className="panel form-panel" onSubmit={createAddon}>
          <div className="form-row">
            <label className="field">
              <span>Name</span>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label className="field">
              <span>Price (R)</span>
              <input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
            </label>
            <label className="field">
              <span>Sort order</span>
              <input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })} />
            </label>
          </div>
          <label className="field" style={{ marginBottom: 16 }}>
            <span>Description</span>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Shown under the add-on name" />
          </label>
          <button className="btn-primary" type="submit">Create add-on</button>
        </form>
      )}

      {loading ? (
        <div className="page-loading">Loading…</div>
      ) : rows.length === 0 ? (
        <p className="empty-state">No add-ons yet.</p>
      ) : (
        <table className="data-table editable-table">
          <thead>
            <tr><th>Name</th><th>Description</th><th>Price (R)</th><th>Sort</th><th>Active</th>{isFinance && <th></th>}</tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                <td><input className="cell-input" style={{ width: 140 }} value={row.name} disabled={!isFinance}
                  onChange={e => updateField(row.id, 'name', e.target.value)} /></td>
                <td><input className="cell-input" style={{ width: 200 }} value={row.description || ''} disabled={!isFinance}
                  onChange={e => updateField(row.id, 'description', e.target.value)} /></td>
                <td><input type="number" step="0.01" className="cell-input mono" value={row.price} disabled={!isFinance}
                  onChange={e => updateField(row.id, 'price', e.target.value)} /></td>
                <td><input type="number" className="cell-input mono" style={{ width: 60 }} value={row.sort_order ?? 0} disabled={!isFinance}
                  onChange={e => updateField(row.id, 'sort_order', e.target.value)} /></td>
                <td><input type="checkbox" checked={row.active} disabled={!isFinance}
                  onChange={e => updateField(row.id, 'active', e.target.checked)} /></td>
                {isFinance && (
                  <td className="row-actions">
                    <button className="btn-small" onClick={() => saveRow(row)} disabled={savingId === row.id}>
                      {savingId === row.id ? '…' : 'Save'}
                    </button>
                    <button className="btn-small btn-danger" onClick={() => removeAddon(row.id)}>Delete</button>
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
