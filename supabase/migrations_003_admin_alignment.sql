-- Applied to project mbtqqnbklcltrtwlpduq on 5 Oct 2026 (migration name: admin_alignment_001).
-- Kept here for the record / disaster recovery. Do not re-run blindly: policies are created without IF NOT EXISTS.

-- 1. Config/money writes: owner + finance only. Reads stay open to all staff.
drop policy if exists "Staff can manage vehicle types" on public.vehicle_types;
create policy "Finance/owner manage vehicle types" on public.vehicle_types for all to public
  using (public.current_admin_role() in ('owner','finance')) with check (public.current_admin_role() in ('owner','finance'));

drop policy if exists "Staff can manage add-ons" on public.service_addons;
create policy "Finance/owner manage add-ons" on public.service_addons for all to public
  using (public.current_admin_role() in ('owner','finance')) with check (public.current_admin_role() in ('owner','finance'));
create policy "Staff can view all add-ons" on public.service_addons for select to public
  using (public.current_admin_role() is not null);

drop policy if exists "Staff can manage promo codes" on public.promo_codes;
create policy "Finance/owner manage promo codes" on public.promo_codes for all to public
  using (public.current_admin_role() in ('owner','finance')) with check (public.current_admin_role() in ('owner','finance'));

drop policy if exists "Staff can update any booking" on public.bookings;
create policy "Finance/owner can update bookings" on public.bookings for update to public
  using (public.current_admin_role() in ('owner','finance')) with check (public.current_admin_role() in ('owner','finance'));

drop policy if exists "Staff can update any profile" on public.profiles;
create policy "Finance/owner can update profiles" on public.profiles for update to public
  using (public.current_admin_role() in ('owner','finance')) with check (public.current_admin_role() in ('owner','finance'));

drop policy if exists "Staff can view/manage all documents" on public.driver_documents;
create policy "Staff can view all documents" on public.driver_documents for select to public
  using (public.current_admin_role() is not null);
create policy "Finance/owner can review documents" on public.driver_documents for update to public
  using (public.current_admin_role() in ('owner','finance')) with check (public.current_admin_role() in ('owner','finance'));

-- 2. Staff can read trip chat
create policy "Staff can view booking messages" on public.booking_messages for select to public
  using (public.current_admin_role() is not null);

-- 3. Audit trail (function audit_admin_change + triggers on vehicle_types, service_addons, load_tiers,
--    payment_methods, profiles.driver_status, driver_documents.status, sos_alerts, account_deletion_requests)
--    and 4. owner-only dispatch RPCs (get_dispatch_settings / update_dispatch_settings).
--    Full function bodies live in the database; export with: select pg_get_functiondef('public.audit_admin_change'::regproc);
