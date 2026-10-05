import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const PROVIDER_LABELS = {
  paystack: 'Paystack',
  ozow: 'Ozow',
  cash: 'Cash',
}

// Providers that are fully wired in the edge functions today
const LIVE_PROVIDERS = new Set(['paystack', 'cash'])

export default function PaymentMethods() {
  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState(null)
  const [status, setStatus] = useState(null)

  useEffect(() => {
    loadMethods()
  }, [])

  async function loadMethods() {
    setLoading(true)
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .order('sort_order')

    if (error) {
      setStatus({ type: 'error', message: `Failed to load: ${error.message}` })
    } else {
      setMethods(data || [])
    }
    setLoading(false)
  }

  async function toggleEnabled(method) {
    const nextEnabled = !method.enabled

    // Don't allow turning off the last enabled method
    const enabledCount = methods.filter((m) => m.enabled).length
    if (method.enabled && enabledCount <= 1) {
      setStatus({
        type: 'error',
        message: 'At least one payment method must stay enabled.',
      })
      return
    }

    // Soft warning for providers that are not integrated yet
    if (nextEnabled && !LIVE_PROVIDERS.has(method.provider)) {
      const ok = window.confirm(
        `${method.display_name} (${PROVIDER_LABELS[method.provider] || method.provider}) is not fully integrated yet. ` +
          'Riders will see an error if they try to use it. Enable anyway?'
      )
      if (!ok) return
    }

    setSavingKey(method.key)
    setStatus(null)

    setMethods((prev) =>
      prev.map((m) => (m.key === method.key ? { ...m, enabled: nextEnabled } : m))
    )

    const { error } = await supabase
      .from('payment_methods')
      .update({ enabled: nextEnabled, updated_at: new Date().toISOString() })
      .eq('key', method.key)

    if (error) {
      setMethods((prev) =>
        prev.map((m) => (m.key === method.key ? { ...m, enabled: method.enabled } : m))
      )
      setStatus({ type: 'error', message: `Failed to save: ${error.message}` })
    } else {
      setStatus({
        type: 'success',
        message: `${method.display_name} ${nextEnabled ? 'enabled' : 'disabled'}.`,
      })
    }
    setSavingKey(null)
  }

  function updateField(key, field, value) {
    setMethods((prev) =>
      prev.map((m) => {
        if (m.key !== key) return m
        if (field === 'display_name') return { ...m, display_name: value }
        if (field === 'public_key') {
          return { ...m, config: { ...(m.config || {}), public_key: value } }
        }
        return m
      })
    )
  }

  async function saveMethod(method) {
    setSavingKey(method.key)
    setStatus(null)

    const payload = {
      display_name: method.display_name,
      updated_at: new Date().toISOString(),
    }

    // Only persist public config fields (never secrets)
    if (method.provider === 'paystack') {
      payload.config = {
        ...(method.config || {}),
        public_key: (method.config && method.config.public_key) || '',
      }
    }

    const { error } = await supabase
      .from('payment_methods')
      .update(payload)
      .eq('key', method.key)

    setStatus(
      error
        ? { type: 'error', message: `Failed to save: ${error.message}` }
        : { type: 'success', message: `${method.display_name} saved.` }
    )
    setSavingKey(null)
  }

  if (loading) {
    return <div className="page-loading">Loading payment methods…</div>
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Payment Methods</h1>
          <p>Changes go live immediately — checkout enforces this table, so a disabled method cannot be used to book.</p>
        </div>
      </header>

      {status && (
        <div className={status.type === 'error' ? 'form-error' : 'notice'}>{status.message}</div>
      )}

      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        {methods.map((method) => {
          const isLive = LIVE_PROVIDERS.has(method.provider)
          const publicKey = (method.config && method.config.public_key) || ''
          const busy = savingKey === method.key

          return (
            <div key={method.key} style={{ padding: 18, borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <input
                      className="cell-input"
                      style={{ width: 220, fontWeight: 600 }}
                      value={method.display_name}
                      onChange={(e) => updateField(method.key, 'display_name', e.target.value)}
                      disabled={busy}
                    />
                    <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>
                      {PROVIDER_LABELS[method.provider] || method.provider}
                    </span>
                    {!isLive && <span className="badge badge-pending">Not live yet</span>}
                    <span className={'badge ' + (method.enabled ? 'badge-active' : 'badge-suspended')}>
                      {method.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="mono small" style={{ color: 'var(--text-dim)', marginTop: 6 }}>key: {method.key}</div>
                </div>

                <button
                  className={'btn-small' + (method.enabled ? ' btn-danger' : ' btn-approve')}
                  onClick={() => toggleEnabled(method)}
                  disabled={busy}
                >
                  {method.enabled ? 'Disable' : 'Enable'}
                </button>
              </div>

              {method.provider === 'paystack' && (
                <label className="field" style={{ marginTop: 14 }}>
                  <span>Paystack public key (pk_…)</span>
                  <input
                    className="mono"
                    placeholder="pk_live_… or pk_test_…"
                    value={publicKey}
                    onChange={(e) => updateField(method.key, 'public_key', e.target.value)}
                    disabled={busy}
                  />
                </label>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <button className="btn-small" onClick={() => saveMethod(method)} disabled={busy}>
                  {busy ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="notice" style={{ marginTop: 18 }}>
        <strong>About secrets.</strong> Only non-secret values (display name, public key, enabled flag) are stored here.
        Provider secret keys (Paystack secret key, future Ozow private key) stay in Supabase Edge Function environment variables
        and must never be pasted into this admin panel. Ozow Instant EFT is marked “Not live yet”: enabling it shows a confirmation,
        and riders still get an error until the integration is built.
      </div>
    </div>
  )
}
