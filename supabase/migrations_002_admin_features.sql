-- EesyLoad Admin — Phase 2 migration (Promotions, Support, Audit)
-- Purely additive: new tables only, zero risk to existing app tables.
-- Run in Supabase SQL editor after supabase/schema.sql.

-- ============================================================
-- 1. PROMOTIONS
-- ============================================================
create table if not exists promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percent','flat')),
  discount_value numeric(10,2) not null,
  max_uses integer,
  used_count integer not null default 0,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references admin_users(id)
);

alter table promo_codes enable row level security;

drop policy if exists "admin_promo_codes_read" on promo_codes;
create policy "admin_promo_codes_read" on promo_codes
  for select using (current_admin_role() is not null);

drop policy if exists "admin_promo_codes_write" on promo_codes;
create policy "admin_promo_codes_write" on promo_codes
  for all using (current_admin_role() in ('owner','finance'))
  with check (current_admin_role() in ('owner','finance'));

-- ============================================================
-- 2. SUPPORT TICKETS
-- ============================================================
create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  subject text not null,
  message text,
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  booking_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_by uuid references admin_users(id)
);

alter table support_tickets enable row level security;

drop policy if exists "admin_support_tickets_read" on support_tickets;
create policy "admin_support_tickets_read" on support_tickets
  for select using (current_admin_role() is not null);

drop policy if exists "admin_support_tickets_write" on support_tickets;
create policy "admin_support_tickets_write" on support_tickets
  for update using (current_admin_role() is not null)
  with check (current_admin_role() is not null);

-- riders/drivers can create their own tickets (app-side, not admin panel)
drop policy if exists "user_support_tickets_insert" on support_tickets;
create policy "user_support_tickets_insert" on support_tickets
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_support_tickets_read_own" on support_tickets;
create policy "user_support_tickets_read_own" on support_tickets
  for select using (auth.uid() = user_id);

-- ============================================================
-- 3. ADMIN AUDIT LOG (lightweight — app calls this from admin panel actions)
-- ============================================================
create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references admin_users(id),
  action text not null,
  target_table text,
  target_id text,
  detail jsonb,
  created_at timestamptz not null default now()
);

alter table admin_audit_log enable row level security;

drop policy if exists "admin_audit_log_read" on admin_audit_log;
create policy "admin_audit_log_read" on admin_audit_log
  for select using (current_admin_role() is not null);

drop policy if exists "admin_audit_log_insert" on admin_audit_log;
create policy "admin_audit_log_insert" on admin_audit_log
  for insert with check (current_admin_role() is not null);
