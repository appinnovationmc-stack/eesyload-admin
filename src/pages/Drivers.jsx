import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const STATUS_TABS = ['pending_review', 'active', 'suspended', 'rejected', 'all']

export default function Drivers() {
  const { isFinance, session } = useAuth()
  const [drivers, setDrivers] = useState([])
  const [filter, setFilter] = useState('pending_review')
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [docs, setDocs] = useState([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [savingDriver, setSavingDriver] = useState(false)

  useEffect(() => { load() }, [filter])

  async function load() {
    setLoading(true)
    let query = supabase
      .from('profiles')
      .select('id, full_name, phone, avatar_url, vehicle_type, vehicle_plate, driver_rating, driver_status, is_online, created_at')
      .not('driver_status', 'is', null)
      .order('created_at', { ascending: false })
      .limit(200)
    if (filter !== 'all') query = query.eq('driver_status', filter)
    const { data, error } = await query
    if (error) console.error(error)
    setDrivers(data || [])
    setLoading(false)
  }

  function getStoragePath(fileUrl) {
    const marker = '/driver-documents/'
    const idx = (fileUrl || '').indexOf(marker)
    if (idx === -1) return null
    return fileUrl.slice(idx + marker.length)
  }

  async function selectDriver(id) {
    setSelectedId(id === selectedId ? null : id)
    if (id === selectedId) return
    setDocsLoading(true)
    const { data, error } = await supabase
      .from('driver_documents')
      .select('id, doc_type, file_url, status, uploaded_at, reviewed_at, reviewed_by')
      .eq('driver_id', id)
      .order('uploaded_at', { ascending: false })
    if (error) console.error(error)
    const docsWithSignedUrls = await Promise.all((data || []).map(async (doc) => {
      const storagePath = getStoragePath(doc.file_url)
      if (!storagePath) return { ...doc, signedUrl: null }
      const { data: signed, error: signErr } = await supabase.storage
        .from('driver-documents')
        .createSignedUrl(storagePath, 3600)
      if (signErr) console.error(signErr)
      return { ...doc, signedUrl: signed?.signedUrl || null }
    }))
    setDocs(docsWithSignedUrls)
    setDocsLoading(false)
  }

  async function setDriverStatus(id, status) {
    setSavingDriver(true)
    const { error } = await supabase.from('profiles').update({ driver_status: status }).eq('id', id)
    setSavingDriver(false)
    if (error) return alert(error.message)
    load()
  }

  async function setDocStatus(docId, status) {
    const { error } = await supabase
      .from('driver_documents')
      .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: session?.user?.id })
      .eq('id', docId)
    if (error) return alert(error.message)
    setDocs(docs.map(d => d.id === docId ? { ...d, status } : d))
  }

  const selected = drivers.find(d => d.id === selectedId)

  return (
    <div>
      <header className="page-header">
        <h1>Drivers</h1>
        <p>Onboarding queue, document review, and driver status control. Approving a driver here is what lets them go online in the driver app.</p>
      </header>

      <div className="filter-tabs">
        {STATUS_TABS.map(f => (
          <button key={f} className={'filter-tab' + (filter === f ? ' active' : '')} onClick={() => setFilter(f)}>
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="page-loading">Loading…</div>
      ) : drivers.length === 0 ? (
        <p className="empty-state">No drivers in this category.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th></th><th>Driver</th><th>Phone</th><th>Vehicle</th><th>Rating</th><th>Status</th><th>Online</th><th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map(d => (
              <>
                <tr key={d.id} className="clickable-row" onClick={() => selectDriver(d.id)}>
                  <td>
                    <div className="avatar-sm">
                      {d.avatar_url ? <img src={d.avatar_url} alt="" /> : (d.full_name?.[0]?.toUpperCase() || '?')}
                    </div>
                  </td>
                  <td>{d.full_name || 'Unnamed'}</td>
                  <td className="mono">{d.phone || '—'}</td>
                  <td>{d.vehicle_type || '—'} {d.vehicle_plate ? `· ${d.vehicle_plate}` : ''}</td>
                  <td className="mono">{d.driver_rating != null ? Number(d.driver_rating).toFixed(1) : '—'}</td>
                  <td><span className={'badge badge-' + d.driver_status}>{d.driver_status}</span></td>
                  <td><span className={'badge ' + (d.is_online ? 'badge-online' : 'badge-offline')}>{d.is_online ? 'Online' : 'Offline'}</span></td>
                  <td className="mono">{d.created_at ? new Date(d.created_at).toLocaleDateString() : '—'}</td>
                </tr>
                {selectedId === d.id && (
                  <tr key={d.id + '-detail'}>
                    <td colSpan={8} className="detail-cell">
                      <div className="driver-detail">
                        {isFinance && (
                          <div className="driver-detail-actions">
                            <span className="detail-label">Driver status:</span>
                            <button className="btn-small btn-approve" disabled={savingDriver || d.driver_status === 'active'} onClick={() => setDriverStatus(d.id, 'active')}>Approve</button>
                            <button className="btn-small" disabled={savingDriver || d.driver_status === 'suspended'} onClick={() => setDriverStatus(d.id, 'suspended')}>Suspend</button>
                            <button className="btn-small btn-danger" disabled={savingDriver || d.driver_status === 'rejected'} onClick={() => setDriverStatus(d.id, 'rejected')}>Reject</button>
                            <button className="btn-small btn-danger" disabled={savingDriver || d.driver_status === 'banned'} onClick={() => setDriverStatus(d.id, 'banned')}>Ban</button>
                          </div>
                        )}

                        <div className="detail-label" style={{ marginTop: 14 }}>Documents</div>
                        {docsLoading ? (
                          <div className="page-loading">Loading documents…</div>
                        ) : docs.length === 0 ? (
                          <p className="empty-state">No documents uploaded yet.</p>
                        ) : (
                          <div className="doc-grid">
                            {docs.map(doc => (
                              <div key={doc.id} className="doc-card">
                                <a href={doc.signedUrl || '#'} target="_blank" rel="noreferrer" className="doc-preview">
                                  {doc.signedUrl && /\.(jpg|jpeg|png|webp)$/i.test(doc.file_url || '') ? (
                                    <img src={doc.signedUrl} alt={doc.doc_type} />
                                  ) : doc.signedUrl ? (
                                    <span className="doc-file-icon">📄</span>
                                  ) : (
                                    <span className="doc-file-icon">⚠️</span>
                                  )}
                                </a>
                                <div className="doc-info">
                                  <div className="doc-type capitalize">{doc.doc_type?.replaceAll('_', ' ')}</div>
                                  <span className={'badge badge-' + doc.status}>{doc.status}</span>
                                </div>
                                {isFinance && doc.status === 'pending' && (
                                  <div className="doc-actions">
                                    <button className="btn-small btn-approve" onClick={() => setDocStatus(doc.id, 'approved')}>Approve</button>
                                    <button className="btn-small btn-danger" onClick={() => setDocStatus(doc.id, 'rejected')}>Reject</button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
