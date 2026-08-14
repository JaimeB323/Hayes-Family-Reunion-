-- Manual RLS verification checklist.
-- Run each block in the Supabase SQL editor after replacing UUID values with real auth.users IDs.
-- These are not automated tests; they document the expected security behavior.

-- 1. As an authenticated member, selecting family_members should only return their own row.
-- select * from public.family_members;

-- 2. As an authenticated member, selecting payments should only return their own payments.
-- select * from public.payments;

-- 3. As a different authenticated member, selecting another member's payments should return zero rows.
-- select * from public.payments where family_member_id = 'OTHER_MEMBER_AUTH_UUID';

-- 4. As an admin member, selecting family_members, payments, registrations and households should return all rows.
-- select * from public.family_members;
-- select * from public.payments;
-- select * from public.reunion_registrations;
-- select * from public.households;

-- 5. As a normal member, inserting a payment should fail. Payments are committee-recorded for now.
-- insert into public.payments (family_member_id, amount, payment_type, payment_method, notes)
-- values (auth.uid(), 10, 'registration', 'venmo', 'Should fail for non-admin');
