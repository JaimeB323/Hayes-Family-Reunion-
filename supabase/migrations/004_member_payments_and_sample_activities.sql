-- Adds member-submitted payment confirmations and initial purchasable activities.
-- Apply after 003_banquet_meal_choice.sql.

alter table public.payments
  add column if not exists payment_status text;

-- Payments recorded before this workflow were entered by the committee.
update public.payments
set payment_status = 'confirmed'
where payment_status is null;

alter table public.payments
  alter column payment_status set default 'pending',
  alter column payment_status set not null;

alter table public.payments
  drop constraint if exists payments_payment_status_check;

alter table public.payments
  add constraint payments_payment_status_check
  check (payment_status in ('pending', 'confirmed'));

create index if not exists payments_payment_status_idx
  on public.payments (payment_status);

drop policy if exists "Members submit own pending payments" on public.payments;
create policy "Members submit own pending payments"
on public.payments for insert
to authenticated
with check (
  payment_status = 'pending'
  and exists (
    select 1
    from public.family_members
    where family_members.id = payments.family_member_id
      and (
        family_members.id = auth.uid()
        or family_members.auth_user_id = auth.uid()
      )
  )
);

insert into public.activities (
  id,
  activity_name,
  description,
  activity_date,
  start_time,
  location,
  price,
  capacity
)
values
  ('10000000-0000-4000-8000-000000000001', 'Welcome Mixer', 'Casual opening gathering for arriving family members.', '2028-08-31', '18:00', 'Charleston Historic District', 20, 150),
  ('10000000-0000-4000-8000-000000000002', 'Family History Walking Tour', 'Guided family-friendly tour through historic Charleston.', '2028-09-01', '10:00', 'Historic Charleston', 35, 80),
  ('10000000-0000-4000-8000-000000000003', 'Charleston Harbor Cruise', 'Afternoon sightseeing cruise for reunion guests.', '2028-09-01', '14:30', 'Charleston Harbor', 45, 100),
  ('10000000-0000-4000-8000-000000000004', 'Family Picnic', 'Outdoor lunch, games and family activities.', '2028-09-02', '12:00', 'Hampton Park', 25, 200),
  ('10000000-0000-4000-8000-000000000005', 'Reunion Banquet', 'Saturday evening family dinner and celebration.', '2028-09-02', '18:30', 'Location TBD', 55, 250)
on conflict (id) do update set
  activity_name = excluded.activity_name,
  description = excluded.description,
  activity_date = excluded.activity_date,
  start_time = excluded.start_time,
  location = excluded.location,
  price = excluded.price,
  capacity = excluded.capacity;
