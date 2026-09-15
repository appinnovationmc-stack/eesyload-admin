import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { logAdminAction } from '../lib/audit'

const STATUS_TABS = ['open', 'in_progress', 'resolved', 'closed', 'all']

export default function Support() {
  const { adminUser } = useAuth()
  const [rows, setRows] = useState([])
  const [filter, setFilter] = useState('open')
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [filter])

  async function load() {
    setLoading(true)
    let query = supabase.from('support_tickets').select('*').order('created_at', { ascending: false }).limit(200)
    if (filter !== 'all') query = query.eq('status', filter)
    const { data, error } = await query
    if (error) console.error(error)
    setRows(data || [])
    setLoading(false)
  }

  async function setStatus(id, status) {
    const patch = { status, updated_at: new Date().toISOString() }
    if (status === 'resolved' || status === 'closed') patch.resolved_by = adminUser?.id
    const { error } = await supabase.from('support_tickets').update(patch).eq('id', id)
    if (error) return alert(error.message)
    await logAdminAction({ adminId: adminUser?.id, action: 'ticket_status_change', targetTable: 'support_tickets', targetId: id, detail: { status } })
    load()
  }

  return (
    <div>
      <header className="page-header">
        <h1>Support</h1>
        <p>Ticket queue. Requires the Phase 2 migration (<span className="mono">support_tickets</span> table).</p>
      </header>

      <div className="filter-tabs">
        {STATUS_TABS.map(f => (
          <button key={f} className={'filter-tab' + (filter === f ? ' active' : '')} onClick={() => setFilter(f)}>
            {f.replaceAll('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="page-loading">Loading…</div>
      ) : rows.length === 0 ? (
        <p className="empty-state">No tickets in this category.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Subject</th><th>Priority</th><th>Created</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map(t => (
              <tr key={t.id}>
                <td>
                  <div style={{ fontWeight: 500 }}>{t.subject}</div>
                  {t.message && <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 2, maxWidth: 420 }}>{t.message}</div>}
                </td>
                <td><span className={'badge ' + (t.priority === 'urgent' || t.priority === 'high' ? 'badge-failed' : 'badge-pending')}>{t.priority}</span></td>
                <td className="mono">{t.created_at ? new Date(t.created_at).toLocaleString() : '—'}</td>
                <td><span className={'badge badge-' + t.status}>{t.status.replaceAll('_', ' ')}</span></td>
                <td className="row-actions">
                  {t.status !== 'in_progress' && <button className="btn-small" onClick={() => setStatus(t.id, 'in_progress')}>In progress</button>}
                  {t.status !== 'resolved' && <button className="btn-small btn-approve" onClick={() => setStatus(t.id, 'resolved')}>Resolve</button>}
                  {t.status !== 'closed' && <button className="btn-small" onClick={() => setStatus(t.id, 'closed')}>Close</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
