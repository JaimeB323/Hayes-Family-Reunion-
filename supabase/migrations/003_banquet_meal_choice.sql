-- Adds per-attendee banquet and attendance details for household registration.
-- Apply after 002_household_member_management.sql.

alter table public.family_members
  add column if not exists banquet_meal_choice text check (banquet_meal_choice in ('steak', 'chicken', 'vegetarian')),
  add column if not exists attendee_status text not null default 'registered' check (attendee_status in ('registered', 'not_attending'));

update public.family_members
set attendee_status = 'registered'
where attendee_status is null;
