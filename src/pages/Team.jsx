import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { logAdminAction } from '../lib/audit'

export default function Team() {
  const { isOwner, adminUser } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ id: '', email: '', role: 'support' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('admin_users').select('*').order('created_at', { ascending: true })
    if (error) console.error(error)
    setRows(data || [])
    setLoading(false)
  }

  async function addAdmin(e) {
    e.preventDefault()
    setError('')
    if (!form.id.trim() || !form.email.trim()) { setError('UUID and email are required — grab the UUID from Supabase → Authentication → Users.'); return }
    setSaving(true)
    const { error } = await supabase.from('admin_users').insert({ id: form.id.trim(), email: form.email.trim(), role: form.role })
    setSaving(false)
    if (error) { setError(error.message); return }
    await logAdminAction({ adminId: adminUser?.id, action: 'admin_added', targetTable: 'admin_users', targetId: form.id, detail: { role: form.role } })
    setForm({ id: '', email: '', role: 'support' })
    setShowForm(false)
    load()
  }

  async function changeRole(id, role) {
    const { error } = await supabase.from('admin_users').update({ role }).eq('id', id)
    if (error) return alert(error.message)
    await logAdminAction({ adminId: adminUser?.id, action: 'admin_role_changed', targetTable: 'admin_users', targetId: id, detail: { role } })
    load()
  }

  async function removeAdmin(id) {
    if (id === adminUser?.id) { alert("You can't remove your own admin access here."); return }
    if (!confirm('Remove this admin?')) return
    const { error } = await supabase.from('admin_users').delete().eq('id', id)
    if (error) return alert(error.message)
    await logAdminAction({ adminId: adminUser?.id, action: 'admin_removed', targetTable: 'admin_users', targetId: id })
    load()
  }

  if (!isOwner) {
    return (
      <div>
        <header className="page-header"><h1>Team</h1></header>
        <p className="empty-state">Only the owner role can manage admin team members.</p>
      </div>
    )
  }

  return (
    <div>
      <header className="page-header">
        <h1>Team</h1>
        <p>Admin users and roles. New admins must already have a Supabase auth account — grab their UUID from Authentication → Users first.</p>
        <button className="btn-primary" onClick={() => setShowForm(s => !s)}>{showForm ? 'Cancel' : '+ Add admin'}</button>
      </header>

      {showForm && (
        <form className="panel form-panel" onSubmit={addAdmin}>
          <div className="form-row">
            <label className="field"><span>Auth user UUID</span>
              <input value={form.id} onChange={e => setForm({ ...form, id: e.target.value })} placeholder="00000000-0000-0000-0000-000000000000" />
            </label>
            <label className="field"><span>Email</span>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </label>
            <label className="field"><span>Role</span>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="support">Support</option>
                <option value="finance">Finance</option>
                <option value="owner">Owner</option>
              </select>
            </label>
          </div>
          {error && <div className="form-error">{error}</div>}
          <button className="btn-primary" type="submit" disabled={saving}>{saving ? 'Adding…' : 'Add admin'}</button>
        </form>
      )}

      {loading ? (
        <div className="page-loading">Loading…</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Email</th><th>Role</th><th>Added</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map(a => (
              <tr key={a.id}>
                <td>{a.email}{a.id === adminUser?.id && <span style={{ color: 'var(--text-dim)', fontSize: 12 }}> (you)</span>}</td>
                <td>
                  <select className="cell-input" value={a.role} onChange={e => changeRole(a.id, e.target.value)} disabled={a.id === adminUser?.id}>
                    <option value="support">support</option>
                    <option value="finance">finance</option>
                    <option value="owner">owner</option>
                  </select>
                </td>
                <td className="mono">{a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}</td>
                <td className="row-actions">
                  <button className="btn-small btn-danger" disabled={a.id === adminUser?.id} onClick={() => removeAdmin(a.id)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
