import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AddonsPanel() {
  const [addons, setAddons] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [error, setError] = useState('')
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => { loadAddons() }, [])

  async function loadAddons() {
    setLoading(true)
    const { data, error } = await supabase
      .from('service_addons')
      .select('*')
      .order('sort_order')
    if (error) setError(error.message)
    else setAddons(data)
    setLoading(false)
  }

  function updateField(id, field, value) {
    setAddons(addons.map(a => a.id === id ? { ...a, [field]: value } : a))
  }

  async function saveAddon(addon) {
    setSavingId(addon.id)
    setError('')
    const { error } = await supabase
      .from('service_addons')
      .update({
        name: addon.name,
        description: addon.description,
        price: addon.price,
        active: addon.active,
        sort_order: addon.sort_order,
      })
      .eq('id', addon.id)
    if (error) setError(error.message)
    setSavingId(null)
  }

  async function deleteAddon(id) {
    if (!confirm('Delete this add-on? This cannot be undone.')) return
    const { error } = await supabase.from('service_addons').delete().eq('id', id)
    if (error) setError(error.message)
    else setAddons(addons.filter(a => a.id !== id))
  }

  async function addNewAddon() {
    if (!newName.trim() || newPrice === '') return
    setAdding(true)
    setError('')
    const { error } = await supabase.from('service_addons').insert({
      name: newName.trim(),
      description: newDesc.trim() || null,
      price: parseFloat(newPrice),
      active: true,
      sort_order: addons.length + 1,
    })
    if (error) setError(error.message)
    else {
      setNewName(''); setNewDesc(''); setNewPrice('')
      loadAddons()
    }
    setAdding(false)
  }

  if (loading) return <div className="page-loading">Loading add-ons…</div>

  return (
    <div className="panel">
      <h2>Ride Add-ons</h2>
      <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: -8, marginBottom: 14 }}>
        Optional extras riders can add to a booking (loading helpers, insurance, etc).
        Only active add-ons appear in the rider app.
      </p>
      {error && <div className="form-error">{error}</div>}
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Price (R)</th>
            <th>Order</th>
            <th>Active</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {addons.map(a => (
            <tr key={a.id}>
              <td>
                <input
                  className="cell-input"
                  type="text"
                  value={a.name}
                  onChange={e => updateField(a.id, 'name', e.target.value)}
                />
              </td>
              <td>
                <input
                  className="cell-input"
                  type="text"
                  value={a.description || ''}
                  onChange={e => updateField(a.id, 'description', e.target.value)}
                />
              </td>
              <td>
                <input
                  className="cell-input"
                  type="number"
                  value={a.price}
                  onChange={e => updateField(a.id, 'price', parseFloat(e.target.value))}
                />
              </td>
              <td>
                <input
                  className="cell-input"
                  type="number"
                  value={a.sort_order}
                  onChange={e => updateField(a.id, 'sort_order', parseInt(e.target.value))}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={a.active}
                  onChange={e => updateField(a.id, 'active', e.target.checked)}
                />
              </td>
              <td style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn-small"
                  disabled={savingId === a.id}
                  onClick={() => saveAddon(a)}
                >
                  {savingId === a.id ? 'Saving…' : 'Save'}
                </button>
                <button
                  className="btn-small"
                  style={{ background: 'var(--danger, #c0392b)' }}
                  onClick={() => deleteAddon(a.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ marginTop: 24, fontSize: 15 }}>Add New Add-on</h3>
      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <input
          className="cell-input"
          type="text"
          placeholder="Name"
          value={newName}
          onChange={e => setNewName(e.target.value)}
        />
        <input
          className="cell-input"
          type="text"
          placeholder="Description"
          value={newDesc}
          onChange={e => setNewDesc(e.target.value)}
        />
        <input
          className="cell-input"
          type="number"
          placeholder="Price (R)"
          value={newPrice}
          onChange={e => setNewPrice(e.target.value)}
        />
        <button className="btn-small" disabled={adding} onClick={addNewAddon}>
          {adding ? 'Adding…' : 'Add'}
        </button>
      </div>
    </div>
  )
}
