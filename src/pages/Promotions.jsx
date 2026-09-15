import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { logAdminAction } from '../lib/audit'

export default function Promotions() {
  const { isFinance, adminUser } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ code: '', discount_type: 'percent', discount_value: '', max_uses: '', expires_at: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false })
    if (error) console.error(error)
    setRows(data || [])
    setLoading(false)
  }

  async function createPromo(e) {
    e.preventDefault()
    setError('')
    if (!form.code.trim() || !form.discount_value) { setError('Code and discount value are required.'); return }
    setSaving(true)
    const { error } = await supabase.from('promo_codes').insert({
      code: form.code.trim().toUpperCase(),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      expires_at: form.expires_at || null,
      created_by: adminUser?.id,
    })
    setSaving(false)
    if (error) { setError(error.message); return }
    await logAdminAction({ adminId: adminUser?.id, action: 'promo_created', targetTable: 'promo_codes', detail: form })
    setForm({ code: '', discount_type: 'percent', discount_value: '', max_uses: '', expires_at: '' })
    setShowForm(false)
    load()
  }

  async function toggleActive(row) {
    const { error } = await supabase.from('promo_codes').update({ active: !row.active }).eq('id', row.id)
    if (error) return alert(error.message)
    await logAdminAction({ adminId: adminUser?.id, action: row.active ? 'promo_deactivated' : 'promo_activated', targetTable: 'promo_codes', targetId: row.id })
    load()
  }

  async function removePromo(id) {
    if (!confirm('Delete this promo code?')) return
    const { error } = await supabase.from('promo_codes').delete().eq('id', id)
    if (error) return alert(error.message)
    await logAdminAction({ adminId: adminUser?.id, action: 'promo_deleted', targetTable: 'promo_codes', targetId: id })
    load()
  }

  return (
    <div>
      <header className="page-header">
        <h1>Promotions</h1>
        <p>Coupon codes and ride credits. Requires the Phase 2 migration (<span className="mono">promo_codes</span> table).</p>
        {isFinance && (
          <button className="btn-primary" onClick={() => setShowForm(s => !s)}>{showForm ? 'Cancel' : '+ New promo code'}</button>
        )}
      </header>

      {showForm && (
        <form className="panel form-panel" onSubmit={createPromo}>
          <div className="form-row">
            <label className="field"><span>Code</span>
              <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="EESY20" />
            </label>
            <label className="field"><span>Type</span>
              <select value={form.discount_type} onChange={e => setForm({ ...form, discount_type: e.target.value })}>
                <option value="percent">Percent off</option>
                <option value="flat">Flat amount (R)</option>
              </select>
            </label>
            <label className="field"><span>Value</span>
              <input type="number" step="0.01" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: e.target.value })} placeholder={form.discount_type === 'percent' ? '20' : '50.00'} />
            </label>
          </div>
          <div className="form-row">
            <label className="field"><span>Max uses (optional)</span>
              <input type="number" value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })} />
            </label>
            <label className="field"><span>Expires (optional)</span>
              <input type="date" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} />
            </label>
          </div>
          {error && <div className="form-error">{error}</div>}
          <button className="btn-primary" type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create promo code'}</button>
        </form>
      )}

      {loading ? (
        <div className="page-loading">Loading…</div>
      ) : rows.length === 0 ? (
        <p className="empty-state">No promo codes yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Code</th><th>Discount</th><th>Used / Max</th><th>Expires</th><th>Status</th>{isFinance && <th></th>}</tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                <td className="mono">{row.code}</td>
                <td>{row.discount_type === 'percent' ? `${row.discount_value}%` : `R${row.discount_value}`}</td>
                <td className="mono">{row.used_count} / {row.max_uses ?? '∞'}</td>
                <td className="mono">{row.expires_at ? new Date(row.expires_at).toLocaleDateString() : '—'}</td>
                <td><span className={'badge ' + (row.active ? 'badge-active' : 'badge-suspended')}>{row.active ? 'Active' : 'Inactive'}</span></td>
                {isFinance && (
                  <td className="row-actions">
                    <button className="btn-small" onClick={() => toggleActive(row)}>{row.active ? 'Deactivate' : 'Activate'}</button>
                    <button className="btn-small btn-danger" onClick={() => removePromo(row.id)}>Delete</button>
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
