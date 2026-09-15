import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuditLog() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('admin_audit_log')
        .select('*, admin_users(email)')
        .order('created_at', { ascending: false })
        .limit(300)
      if (error) console.error(error)
      setRows(data || [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div>
      <header className="page-header">
        <h1>Audit Log</h1>
        <p>Every admin write action, logged automatically. Requires the Phase 2 migration (<span className="mono">admin_audit_log</span> table).</p>
      </header>

      {loading ? (
        <div className="page-loading">Loading…</div>
      ) : rows.length === 0 ? (
        <p className="empty-state">No actions logged yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>When</th><th>Admin</th><th>Action</th><th>Target</th><th>Detail</th></tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td className="mono">{new Date(r.created_at).toLocaleString()}</td>
                <td>{r.admin_users?.email || r.admin_id?.slice(0, 8) || '—'}</td>
                <td>{r.action}</td>
                <td className="mono small">{r.target_table}{r.target_id ? ` · ${String(r.target_id).slice(0, 8)}` : ''}</td>
                <td className="mono small">{r.detail ? JSON.stringify(r.detail) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
