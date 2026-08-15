-- Household member management for the Hayes Family Reunion portal.
-- Apply after 001_initial_schema.sql.

alter table public.family_members
  drop constraint if exists family_members_id_fkey;

alter table public.family_members
  alter column id set default gen_random_uuid(),
  alter column email drop not null;

alter table public.family_members
  add column if not exists auth_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists is_primary_contact boolean not null default false,
  add column if not exists category text check (category in ('adult', 'child')),
  add column if not exists t_shirt_size text,
  add column if not exists expected_arrival text,
  add column if not exists updated_at timestamptz not null default now();

update public.family_members
set auth_user_id = id,
    is_primary_contact = true
where auth_user_id is null
  and email is not null;

create unique index if not exists family_members_auth_user_id_key
  on public.family_members (auth_user_id)
  where auth_user_id is not null;

create unique index if not exists reunion_registrations_family_member_id_key
  on public.reunion_registrations (family_member_id);

drop trigger if exists touch_family_members_updated_at on public.family_members;
create trigger touch_family_members_updated_at
before update on public.family_members
for each row execute function public.touch_updated_at();

create or replace function public.current_household_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select household_name
  from public.family_members
  where auth_user_id = auth.uid()
     or id = auth.uid()
  order by is_primary_contact desc, created_at asc
  limit 1;
$$;

drop policy if exists "Members can view own profile; admins view all" on public.family_members;
create policy "Members can view household profiles; admins view all"
on public.family_members for select
to authenticated
using (
  public.is_admin()
  or auth_user_id = auth.uid()
  or id = auth.uid()
  or (
    household_name is not null
    and household_name = public.current_household_name()
  )
);

drop policy if exists "Members can insert own profile" on public.family_members;
create policy "Members can insert household profiles"
on public.family_members for insert
to authenticated
with check (
  role = 'member'
  and (
    public.is_admin()
    or (id = auth.uid() and (auth_user_id is null or auth_user_id = auth.uid()))
    or (auth_user_id = auth.uid())
    or (
      auth_user_id is null
      and household_name is not null
      and household_name = public.current_household_name()
    )
  )
);

drop policy if exists "Members can update own profile; admins update all" on public.family_members;
create policy "Members can update household profiles; admins update all"
on public.family_members for update
to authenticated
using (
  public.is_admin()
  or auth_user_id = auth.uid()
  or id = auth.uid()
  or (
    household_name is not null
    and household_name = public.current_household_name()
  )
)
with check (
  public.is_admin()
  or auth_user_id = auth.uid()
  or id = auth.uid()
  or (
    auth_user_id is null
    and household_name is not null
    and household_name = public.current_household_name()
  )
);

drop policy if exists "Members can delete household profiles; admins delete all" on public.family_members;
create policy "Members can delete household profiles; admins delete all"
on public.family_members for delete
to authenticated
using (
  public.is_admin()
  or (
    auth_user_id is null
    and household_name is not null
    and household_name = public.current_household_name()
  )
);

drop policy if exists "Members view own household" on public.households;
create policy "Members view own household"
on public.households for select
to authenticated
using (
  public.is_admin()
  or primary_contact_id = auth.uid()
  or household_name = public.current_household_name()
);

drop policy if exists "Members create own household" on public.households;
create policy "Members create own household"
on public.households for insert
to authenticated
with check (
  public.is_admin()
  or primary_contact_id = auth.uid()
);

drop policy if exists "Members update own household" on public.households;
create policy "Members update own household"
on public.households for update
to authenticated
using (
  public.is_admin()
  or primary_contact_id = auth.uid()
  or household_name = public.current_household_name()
)
with check (
  public.is_admin()
  or primary_contact_id = auth.uid()
  or household_name = public.current_household_name()
);

drop policy if exists "Members update own registrations" on public.reunion_registrations;
create policy "Members update own registrations"
on public.reunion_registrations for update
to authenticated
using (family_member_id = auth.uid() or public.is_admin())
with check (family_member_id = auth.uid() or public.is_admin());

drop policy if exists "Members update own activity registrations" on public.activity_registrations;
create policy "Members update own activity registrations"
on public.activity_registrations for update
to authenticated
using (family_member_id = auth.uid() or public.is_admin())
with check (family_member_id = auth.uid() or public.is_admin());

drop policy if exists "Members delete own activity registrations" on public.activity_registrations;
create policy "Members delete own activity registrations"
on public.activity_registrations for delete
to authenticated
using (family_member_id = auth.uid() or public.is_admin());
