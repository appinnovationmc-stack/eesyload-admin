import { supabase } from './supabase'

export async function logAdminAction({ adminId, action, targetTable, targetId, detail }) {
  try {
    await supabase.from('admin_audit_log').insert({
      admin_id: adminId,
      action,
      target_table: targetTable,
      target_id: targetId ? String(targetId) : null,
      detail: detail || null,
    })
  } catch (e) {
    // Audit logging should never block the actual action
    console.warn('audit log failed', e)
  }
}
