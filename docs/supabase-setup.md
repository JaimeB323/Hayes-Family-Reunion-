# Supabase Setup

This site is ready to connect to the Supabase project named **Hayes Family Reunion**.

The integration is intentionally modular: the current static HTML remains the fallback experience, and Supabase-powered data replaces demo content only when a public Supabase URL, anon key and authenticated session are available.

## Tables

The migration in `supabase/migrations/001_initial_schema.sql` creates:

- `family_members`: one profile per authenticated family member. The `id` matches `auth.users.id`.
- `households`: household-level totals and the primary contact relationship.
- `reunion_registrations`: reunion registration totals by family member.
- `payments`: committee-recorded payments only. No payment processor is connected yet.
- `activities`: reunion activities that the committee can manage.
- `activity_registrations`: joins family members to activities.

## Relationships

- `family_members.id` references `auth.users.id`.
- `households.primary_contact_id` references `family_members.id`.
- `reunion_registrations.family_member_id` references `family_members.id`.
- `payments.family_member_id` references `family_members.id`.
- `activity_registrations.family_member_id` references `family_members.id`.
- `activity_registrations.activity_id` references `activities.id`.

## Authentication

Family members will sign in with their email address through Supabase Auth. The browser code uses the public anon key only. Never place a Supabase service-role key in client-side JavaScript or in GitHub.

The login page loads:

- `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`
- `js/supabase-config.js`
- `js/supabase-client.js`
- `js/auth.js`

If Supabase is not configured, the existing dummy login remains available as a prototype fallback.

## Row Level Security

RLS is enabled on every reunion table.

Family members can:

- view their own `family_members` row
- create their own member profile
- view their own registration
- view their own payments
- view their own activity registrations
- view available activities

Admins can:

- view and manage all member, household, registration, activity and payment data
- manually record payments
- manage activities

The migration creates a helper function:

```sql
public.is_admin()
```

It checks whether the logged-in user's `family_members.role` is `admin`.

## Creating the First Admin User

1. In Supabase Auth, create or invite the first committee user's email address.
2. Copy that user's UUID from **Authentication > Users**.
3. Run this in the SQL editor, replacing the placeholder values:

```sql
insert into public.family_members (
  id,
  first_name,
  last_name,
  email,
  role
) values (
  'AUTH_USER_UUID',
  'First',
  'Last',
  'committee@example.com',
  'admin'
)
on conflict (id) do update
set role = 'admin';
```

Only use the SQL editor or a secure backend for this. Do not expose admin-role creation in the public site.

## Environment Configuration

The browser only needs public Supabase values:

```bash
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

For local static testing, edit `js/supabase-config.js` with those public values, or run:

```bash
SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co" \
SUPABASE_ANON_KEY="YOUR_PUBLIC_ANON_KEY" \
node scripts/write-supabase-config.mjs
```

The service-role key must never be committed. Use it only in secure server-side tooling if needed later.

## Cloudflare Deployment

When moving to Cloudflare Pages later:

1. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` as Cloudflare environment variables.
2. Set the build command to:

```bash
node scripts/write-supabase-config.mjs
```

3. Set the output directory to the project root if deploying this static site as-is.

Cloudflare will generate `js/supabase-config.js` during deployment from environment variables. The public anon key is safe for browser use when RLS is correctly configured.

## Local Testing

1. Apply `supabase/migrations/001_initial_schema.sql` in Supabase.
2. Optionally apply `supabase/seed.sql`.
3. Configure `js/supabase-config.js`.
4. Open `login.html`, create/sign in with a Supabase Auth user, then open `member.html`.
5. Use `supabase/tests/rls_checklist.sql` as a manual checklist to verify member isolation and admin access.

Expected results:

- a normal member can only read their own profile, registration, activity registrations and payments
- a normal member cannot insert payments
- an admin can read and manage all reunion data

## Current Limitations

- Payments are manually recorded by committee/admin users. There is no payment processor yet.
- GitHub Pages does not provide runtime environment variables. Use the checked-in empty config for local fallback, edit it manually for testing, or deploy through Cloudflare with the config generation script.
- Supabase live verification requires your project URL, anon key and test Auth users.
