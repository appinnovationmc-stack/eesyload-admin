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
    return <div className="p-6 text-sm text-gray-500">Loading payment methods…</div>
  }

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-lg font-semibold mb-1">Payment Methods</h2>
      <p className="text-sm text-gray-500 mb-4">
        Changes go live immediately — the rider app reads this table directly.
      </p>

      {status && (
        <div
          className={`mb-4 rounded-md px-3 py-2 text-sm ${
            status.type === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}
        >
          {status.message}
        </div>
      )}

      <div className="divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
        {methods.map((method) => {
          const isLive = LIVE_PROVIDERS.has(method.provider)
          const publicKey = (method.config && method.config.public_key) || ''

          return (
            <div key={method.key} className="p-4 bg-white space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      className="font-medium text-sm border-b border-transparent hover:border-gray-300 focus:border-gray-400 outline-none bg-transparent"
                      value={method.display_name}
                      onChange={(e) => updateField(method.key, 'display_name', e.target.value)}
                      disabled={savingKey === method.key}
                    />
                    <span className="text-xs text-gray-400">
                      {PROVIDER_LABELS[method.provider] || method.provider}
                    </span>
                    {!isLive && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                        Not live yet
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">key: {method.key}</p>
                </div>

                <button
                  onClick={() => toggleEnabled(method)}
                  disabled={savingKey === method.key}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    method.enabled ? 'bg-green-500' : 'bg-gray-300'
                  } ${savingKey === method.key ? 'opacity-50' : ''}`}
                  title={method.enabled ? 'Disable' : 'Enable'}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${\n                      method.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {method.provider === 'paystack' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Paystack public key (pk_…)
                  </label>
                  <input
                    className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 font-mono"
                    placeholder="pk_live_… or pk_test_…"
                    value={publicKey}
                    onChange={(e) => updateField(method.key, 'public_key', e.target.value)}
                    disabled={savingKey === method.key}
                  />
                </div>
              )}

              <div className="flex justify-end">
                <button
                  className="text-xs font-medium px-3 py-1.5 rounded bg-gray-900 text-white disabled:opacity-50"
                  onClick={() => saveMethod(method)}
                  disabled={savingKey === method.key}
                >
                  {savingKey === method.key ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-5 rounded-md border border-gray-200 bg-gray-50 px-3 py-3 text-xs text-gray-600 space-y-1">
        <p className="font-medium text-gray-700">About secrets</p>
        <p>
          Only non-secret values (display name, public key, enabled flag) are stored here.
          Provider <strong>secret</strong> keys (Paystack secret key, future Ozow private key)
          stay in Supabase Edge Function environment variables and must never be pasted into
          this admin panel.
        </p>
        <p className="pt-1">
          Ozow Instant EFT is marked “Not live yet”. Enabling it will show a confirmation;
          riders will still get an error until the full integration is built.
        </p>
      </div>
    </div>
  )
}
