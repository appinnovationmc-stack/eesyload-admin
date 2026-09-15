# EesyLoad Admin Panel

Admin panel wired directly to your **live production tables**: `vehicle_types`, `addons`, `bookings`. Not a parallel schema — it reads and writes the same data your rider and driver apps already use.

## 1. Run the migration

In Supabase SQL editor, run `supabase/schema.sql`. It's purely additive:
- New columns on `vehicle_types` (`commission_percent`, `min_commission`)
- New columns on `bookings` (`commission_amount`, `driver_payout`, `payout_status`, `paystack_reference`)
- A trigger that auto-computes commission + driver payout the moment a booking's `status` flips to `'delivered'`
- A new `admin_users` table for role-based access (owner / finance / support)
- Additive RLS policies — your existing rider/driver policies are untouched

## 2. Make yourself owner

Sign up (or use your existing) auth user, grab the UUID from Supabase → Authentication → Users, then:
```sql
insert into admin_users (id, email, role)
values ('<your-uuid>', '<your-email>', 'owner');
```

## 3. Environment

```bash
cp .env.example .env
```
The Supabase URL and anon key are already filled in from your project — just add `VITE_PAYSTACK_PUBLIC_KEY` when you wire up split payouts.

## 4. Run

```bash
npm install
npm run dev
```

## Pages

- **Dashboard** — pending payout count, active vehicle types, recent bookings
- **Pricing** — edits `vehicle_types` directly (name, capacity, base price, active, sort order) — rider app picks this up live
- **Add-ons** — edits `addons` directly — same live read by the rider app
- **Commission** — `commission_percent` / `min_commission` per vehicle type
- **Payouts** — delivered bookings with computed commission + driver payout, filterable by status, manual mark-paid/failed for reconciliation

## How commission actually gets calculated

No app-side changes needed. When your driver app calls `updateBookingStatus(bookingId, 'delivered')`, a Postgres trigger:
1. Looks up `commission_percent` / `min_commission` from `vehicle_types` by matching `vehicle_name`
2. Computes `commission_amount = max(total_fare * percent/100, min_commission)`
3. Sets `driver_payout = total_fare - commission_amount`
4. Sets `payout_status = 'pending'`

That's what the Payouts page reconciles against.

## Next: Paystack split payouts

`paystack_reference` and `payout_status` are ready on `bookings`. The actual Paystack split-payment call needs to happen server-side (Supabase Edge Function) when a booking is created or delivered — set up a sub-account per driver, split the charge automatically. That's the next build.
