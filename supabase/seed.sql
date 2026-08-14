-- Optional seed data for local/testing environments.
-- Replace user IDs with real auth.users IDs from your Supabase project before running.

insert into public.activities (activity_name, description, activity_date, start_time, location, price, capacity)
values
  ('Welcome Reception', 'Opening reception for arriving family members.', '2028-08-31', null, 'TBD', 0, null),
  ('Family Picnic', 'Outdoor family gathering and activities.', '2028-09-02', null, 'TBD', 0, null),
  ('Celebration Dinner', 'Evening dinner celebration.', '2028-09-02', null, 'TBD', 0, null),
  ('Farewell Brunch', 'Closing brunch before departure.', '2028-09-03', null, 'TBD', 0, null)
on conflict do nothing;
