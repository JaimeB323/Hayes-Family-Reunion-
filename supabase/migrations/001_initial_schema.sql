-- Hayes Family Reunion Supabase schema
-- Apply this in the Supabase SQL editor or with the Supabase CLI.

create extension if not exists pgcrypto;

create table if not exists public.family_members (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null unique,
  phone text,
  household_name text,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  household_name text not null unique,
  primary_contact_id uuid references public.family_members(id) on delete set null,
  total_family_members integer not null default 0 check (total_family_members >= 0),
  total_amount_due numeric(10,2) not null default 0 check (total_amount_due >= 0),
  total_amount_paid numeric(10,2) not null default 0 check (total_amount_paid >= 0),
  balance_remaining numeric(10,2) generated always as (total_amount_due - total_amount_paid) stored,
  created_at timestamptz not null default now()
);

create table if not exists public.reunion_registrations (
  id uuid primary key default gen_random_uuid(),
  family_member_id uuid not null references public.family_members(id) on delete cascade,
  registration_status text not null default 'pending' check (registration_status in ('pending', 'registered', 'waitlisted', 'cancelled')),
  number_of_guests integer not null default 0 check (number_of_guests >= 0),
  total_amount_due numeric(10,2) not null default 0 check (total_amount_due >= 0),
  total_amount_paid numeric(10,2) not null default 0 check (total_amount_paid >= 0),
  balance_remaining numeric(10,2) generated always as (total_amount_due - total_amount_paid) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  family_member_id uuid not null references public.family_members(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  payment_type text not null default 'registration' check (payment_type in ('registration', 'activity', 'donation', 'other')),
  payment_method text not null check (payment_method in ('venmo', 'zelle', 'cash', 'check', 'other')),
  payment_date date not null default current_date,
  transaction_reference text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  activity_name text not null,
  description text,
  activity_date date not null,
  start_time time,
  location text,
  price numeric(10,2) not null default 0 check (price >= 0),
  capacity integer check (capacity is null or capacity >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.activity_registrations (
  id uuid primary key default gen_random_uuid(),
  family_member_id uuid not null references public.family_members(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  number_of_attendees integer not null default 1 check (number_of_attendees > 0),
  amount_due numeric(10,2) not null default 0 check (amount_due >= 0),
  amount_paid numeric(10,2) not null default 0 check (amount_paid >= 0),
  registration_status text not null default 'pending' check (registration_status in ('pending', 'registered', 'waitlisted', 'cancelled')),
  created_at timestamptz not null default now(),
  unique (family_member_id, activity_id)
);

create index if not exists family_members_email_idx on public.family_members (lower(email));
create index if not exists family_members_household_name_idx on public.family_members (household_name);
create index if not exists reunion_registrations_family_member_id_idx on public.reunion_registrations (family_member_id);
create index if not exists payments_family_member_id_idx on public.payments (family_member_id);
create index if not exists activities_activity_date_idx on public.activities (activity_date);
create index if not exists activity_registrations_family_member_id_idx on public.activity_registrations (family_member_id);
create index if not exists activity_registrations_activity_id_idx on public.activity_registrations (activity_id);
create index if not exists households_primary_contact_id_idx on public.households (primary_contact_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_reunion_registrations_updated_at on public.reunion_registrations;
create trigger touch_reunion_registrations_updated_at
before update on public.reunion_registrations
for each row execute function public.touch_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.prevent_member_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' and new.role <> 'member' then
    raise exception 'Only admins can create admin profiles.';
  end if;

  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    raise exception 'Only admins can change member roles.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_family_member_role_escalation on public.family_members;
create trigger prevent_family_member_role_escalation
before insert or update on public.family_members
for each row execute function public.prevent_member_role_escalation();

alter table public.family_members enable row level security;
alter table public.households enable row level security;
alter table public.reunion_registrations enable row level security;
alter table public.payments enable row level security;
alter table public.activities enable row level security;
alter table public.activity_registrations enable row level security;

drop policy if exists "Members can view own profile; admins view all" on public.family_members;
create policy "Members can view own profile; admins view all"
on public.family_members for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "Members can insert own profile" on public.family_members;
create policy "Members can insert own profile"
on public.family_members for insert
to authenticated
with check (id = auth.uid() and role = 'member');

drop policy if exists "Members can update own profile; admins update all" on public.family_members;
create policy "Members can update own profile; admins update all"
on public.family_members for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists "Admins manage households" on public.households;
create policy "Admins manage households"
on public.households for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Members view own household" on public.households;
create policy "Members view own household"
on public.households for select
to authenticated
using (primary_contact_id = auth.uid() or public.is_admin());

drop policy if exists "Members view own registrations; admins manage all" on public.reunion_registrations;
create policy "Members view own registrations; admins manage all"
on public.reunion_registrations for select
to authenticated
using (family_member_id = auth.uid() or public.is_admin());

drop policy if exists "Members create own registration" on public.reunion_registrations;
create policy "Members create own registration"
on public.reunion_registrations for insert
to authenticated
with check (family_member_id = auth.uid() or public.is_admin());

drop policy if exists "Admins update registrations" on public.reunion_registrations;
create policy "Admins update registrations"
on public.reunion_registrations for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins delete registrations" on public.reunion_registrations;
create policy "Admins delete registrations"
on public.reunion_registrations for delete
to authenticated
using (public.is_admin());

drop policy if exists "Members view own payments; admins manage all" on public.payments;
create policy "Members view own payments; admins manage all"
on public.payments for select
to authenticated
using (family_member_id = auth.uid() or public.is_admin());

drop policy if exists "Admins insert payments" on public.payments;
create policy "Admins insert payments"
on public.payments for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins update payments" on public.payments;
create policy "Admins update payments"
on public.payments for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins delete payments" on public.payments;
create policy "Admins delete payments"
on public.payments for delete
to authenticated
using (public.is_admin());

drop policy if exists "Authenticated users view activities" on public.activities;
create policy "Authenticated users view activities"
on public.activities for select
to authenticated
using (true);

drop policy if exists "Admins manage activities" on public.activities;
create policy "Admins manage activities"
on public.activities for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Members view own activity registrations; admins manage all" on public.activity_registrations;
create policy "Members view own activity registrations; admins manage all"
on public.activity_registrations for select
to authenticated
using (family_member_id = auth.uid() or public.is_admin());

drop policy if exists "Members create own activity registrations" on public.activity_registrations;
create policy "Members create own activity registrations"
on public.activity_registrations for insert
to authenticated
with check (family_member_id = auth.uid() or public.is_admin());

drop policy if exists "Admins update activity registrations" on public.activity_registrations;
create policy "Admins update activity registrations"
on public.activity_registrations for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins delete activity registrations" on public.activity_registrations;
create policy "Admins delete activity registrations"
on public.activity_registrations for delete
to authenticated
using (public.is_admin());
