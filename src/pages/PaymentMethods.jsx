// PaymentMethods.jsx
//
// Admin panel for the payment_methods table. Mirrors PricingConfig.jsx's
// pattern: reads/writes the table directly via the Supabase client, RLS
// (owner/finance write, public read of enabled rows) does the enforcement.
//
// ASSUMPTIONS TO ADJUST FOR YOUR REPO:
//   - import path for the Supabase client below (`../lib/supabaseClient`)
//   - whatever layout/wrapper component PricingConfig.jsx uses for the
//     admin page shell — drop this component's JSX inside it the same way
//   - toast/notification helper, if PricingConfig.jsx uses one instead of
//     the inline `status` state used here

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const PROVIDER_LABELS = {
  paystack: "Paystack",
  ozow: "Ozow",
  cash: "Cash",
};

export default function PaymentMethods() {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [status, setStatus] = useState(null); // { type: 'error'|'success', message }

  useEffect(() => {
    loadMethods();
  }, []);

  async function loadMethods() {
    setLoading(true);
    const { data, error } = await supabase
      .from("payment_methods")
      .select("*")
      .order("sort_order");

    if (error) {
      setStatus({ type: "error", message: `Failed to load: ${error.message}` });
    } else {
      setMethods(data || []);
    }
    setLoading(false);
  }

  async function toggleEnabled(method) {
    const nextEnabled = !method.enabled;

    // Guard: don't let the last enabled method get switched off, or riders
    // hit a checkout screen with nothing to pay with.
    const enabledCount = methods.filter((m) => m.enabled).length;
    if (method.enabled && enabledCount <= 1) {
      setStatus({
        type: "error",
        message: "At least one payment method must stay enabled.",
      });
      return;
    }

    setSavingKey(method.key);
    setStatus(null);

    // Optimistic update
    setMethods((prev) =>
      prev.map((m) => (m.key === method.key ? { ...m, enabled: nextEnabled } : m))
    );

    const { error } = await supabase
      .from("payment_methods")
      .update({ enabled: nextEnabled, updated_at: new Date().toISOString() })
      .eq("key", method.key);

    if (error) {
      // Roll back on failure
      setMethods((prev) =>
        prev.map((m) => (m.key === method.key ? { ...m, enabled: method.enabled } : m))
      );
      setStatus({ type: "error", message: `Failed to save: ${error.message}` });
    } else {
      setStatus({
        type: "success",
        message: `${method.display_name} ${nextEnabled ? "enabled" : "disabled"}.`,
      });
    }
    setSavingKey(null);
  }

  async function updateDisplayName(key, displayName) {
    setMethods((prev) =>
      prev.map((m) => (m.key === key ? { ...m, display_name: displayName } : m))
    );
  }

  async function saveDisplayName(method) {
    setSavingKey(method.key);
    const { error } = await supabase
      .from("payment_methods")
      .update({ display_name: method.display_name, updated_at: new Date().toISOString() })
      .eq("key", method.key);

    setStatus(
      error
        ? { type: "error", message: `Failed to save name: ${error.message}` }
        : { type: "success", message: "Name updated." }
    );
    setSavingKey(null);
  }

  if (loading) return <div className="p-6 text-sm text-gray-500">Loading payment methods…</div>;

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-lg font-semibold mb-1">Payment Methods</h2>
      <p className="text-sm text-gray-500 mb-4">
        Changes go live immediately — the rider app reads this table directly.
      </p>

      {status && (
        <div
          className={`mb-4 rounded-md px-3 py-2 text-sm ${
            status.type === "error"
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-green-50 text-green-700 border border-green-200"
          }`}
        >
          {status.message}
        </div>
      )}

      <div className="divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
        {methods.map((method) => (
          <div key={method.key} className="flex items-center justify-between gap-4 p-4 bg-white">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <input
                  className="font-medium text-sm border-b border-transparent hover:border-gray-300 focus:border-gray-400 outline-none bg-transparent"
                  value={method.display_name}
                  onChange={(e) => updateDisplayName(method.key, e.target.value)}
                  onBlur={() => saveDisplayName(method)}
                  disabled={savingKey === method.key}
                />
                <span className="text-xs text-gray-400">
                  {PROVIDER_LABELS[method.provider] || method.provider}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">key: {method.key}</p>
            </div>

            <button
              onClick={() => toggleEnabled(method)}
              disabled={savingKey === method.key}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                method.enabled ? "bg-green-500" : "bg-gray-300"
              } ${savingKey === method.key ? "opacity-50" : ""}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  method.enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-4">
        Note: this table only holds non-secret display/config data. Provider secret keys
        (e.g. PAYSTACK_SECRET_KEY) stay in edge function environment variables — never add
        them here.
      </p>
    </div>
  );
}
