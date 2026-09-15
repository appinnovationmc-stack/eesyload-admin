-- EesyLoad Admin — Migration against the REAL production schema
-- (vehicle_types, addons, bookings — as used by the rider/driver apps today)
--
-- This is purely ADDITIVE: new columns, one new table (admin_users), one trigger.
-- It does not touch existing RLS state on vehicle_types / addons / bookings,
-- so the live rider and driver apps keep working exactly as they do now.
--
-- Run in Supabase SQL editor.

-- ============================================================
-- 1. ADMIN ROLES (new table, self-contained, zero risk to existing app)
-- ============================================================
do $$ begin
  create type admin_role as enum ('owner', 'finance', 'support');
exception when duplicate_object then null;
end $$;

create table if not exists admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role admin_role not null default 'support',
  created_at timestamptz not null default now()
);

alter table admin_users enable row level security;

create or replace function current_admin_role()
returns admin_role
language sql security definer stable
as $$ select role from admin_users where id = auth.uid(); $$;

drop policy if exists "admin_users_self_read" on admin_users;
create policy "admin_users_self_read" on admin_users
  for select using (auth.uid() = id or current_admin_role() = 'owner');

drop policy if exists "admin_users_owner_write" on admin_users;
create policy "admin_users_owner_write" on admin_users
  for all using (current_admin_role() = 'owner')
  with check (current_admin_role() = 'owner');

-- ============================================================
-- 2. COMMISSION — lives on vehicle_types (where pricing already lives)
-- ============================================================
alter table vehicle_types add column if not exists commission_percent numeric(5,2) not null default 15.00;
alter table vehicle_types add column if not exists min_commission numeric(10,2) not null default 0;

-- ============================================================
-- 3. PAYOUT TRACKING — lives on bookings (where fares already land)
-- ============================================================
alter table bookings add column if not exists commission_amount numeric(10,2);
alter table bookings add column if not exists driver_payout numeric(10,2);
alter table bookings add column if not exists payout_status text not null default 'pending'
  check (payout_status in ('pending','paid','failed'));
alter table bookings add column if not exists paystack_reference text;

-- ============================================================
-- 4. AUTO-COMPUTE COMMISSION ON DELIVERY
-- Fires when a booking's status flips to 'delivered'. Looks up the
-- commission rate by vehicle_name (matches what rider app already writes),
-- computes commission + driver payout, leaves payout_status = 'pending'
-- for your Paystack payout job / admin panel to action.
-- ============================================================
create or replace function compute_booking_commission()
returns trigger
language plpgsql
as $$
declare
  v_commission_percent numeric(5,2);
  v_min_commission numeric(10,2);
  v_commission numeric(10,2);
begin
  if NEW.status = 'delivered' and (OLD.status is distinct from 'delivered') then
    select commission_percent, min_commission
      into v_commission_percent, v_min_commission
      from vehicle_types
      where name = NEW.vehicle_name
      limit 1;

    if v_commission_percent is null then
      v_commission_percent := 15.00; -- fallback if no vehicle_type match
      v_min_commission := 0;
    end if;

    v_commission := greatest(
      round(NEW.total_fare * v_commission_percent / 100.0, 2),
      v_min_commission
    );

    NEW.commission_amount := v_commission;
    NEW.driver_payout := NEW.total_fare - v_commission;
    NEW.payout_status := 'pending';
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_compute_booking_commission on bookings;
create trigger trg_compute_booking_commission
  before update on bookings
  for each row
  execute function compute_booking_commission();

-- ============================================================
-- 5. ADMIN ACCESS POLICIES (additive — existing rider/driver policies
-- on these tables are untouched; this just grants admins extra access)
-- ============================================================

-- vehicle_types: admins (finance/owner) can write; read stays whatever it already is
drop policy if exists "admin_vehicle_types_write" on vehicle_types;
create policy "admin_vehicle_types_write" on vehicle_types
  for all using (current_admin_role() in ('owner','finance'))
  with check (current_admin_role() in ('owner','finance'));

-- addons: same
drop policy if exists "admin_addons_write" on addons;
create policy "admin_addons_write" on addons
  for all using (current_admin_role() in ('owner','finance'))
  with check (current_admin_role() in ('owner','finance'));

-- bookings: admins (any role) can read all bookings for dashboard/payouts/support
drop policy if exists "admin_bookings_read" on bookings;
create policy "admin_bookings_read" on bookings
  for select using (current_admin_role() is not null);

-- bookings: finance/owner can update payout fields (manual override / marking paid)
drop policy if exists "admin_bookings_payout_update" on bookings;
create policy "admin_bookings_payout_update" on bookings
  for update using (current_admin_role() in ('owner','finance'))
  with check (current_admin_role() in ('owner','finance'));

-- ============================================================
-- 6. MAKE YOURSELF OWNER
-- Find your UUID: Supabase Dashboard → Authentication → Users
-- ============================================================
-- insert into admin_users (id, email, role)
-- values ('<your-auth-user-uuid>', '<your-email>', 'owner');
