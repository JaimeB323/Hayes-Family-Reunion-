# Supabase Setup

This site is ready to connect to the Supabase project named **Hayes Family Reunion**.

The integration is intentionally modular: the current static HTML remains the fallback experience, and Supabase-powered data replaces demo content only when a public Supabase URL, anon key and authenticated session are available.

## Tables

The migration in `supabase/migrations/001_initial_schema.sql` creates:

- `family_members`: one profile per authenticated family member. The `id` matches `auth.users.id`.
- `households`: household-level totals and the primary contact relationship.
- `reunion_registrations`: reunion registration totals by family member.
- `payments`: member-submitted Zelle/Venmo confirmations with pending or confirmed status. No payment processor is connected.
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
- submit their own pending payment confirmations
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

## Confirming a Payment

Member-submitted Zelle and Venmo confirmations begin with `payment_status = 'pending'`. After verifying receipt, an admin can update the payment row in the Supabase Table Editor or run:

```sql
update public.payments
set payment_status = 'confirmed'
where id = 'PAYMENT_UUID_HERE';
```

The Member Portal will show the confirmed status after the member chooses **Payment History** to refresh the section.

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

1. Apply the numbered files in `supabase/migrations/` in order. Migration `004_member_payments_and_sample_activities.sql` adds pending payment confirmations and the initial activity menu.
2. Optionally apply `supabase/seed.sql` only in a separate local testing project.
3. Configure `js/supabase-config.js`.
4. Open `login.html`, create/sign in with a Supabase Auth user, then open `member.html`.
5. Use `supabase/tests/rls_checklist.sql` as a manual checklist to verify member isolation and admin access.

Expected results:

- a normal member can only read their own profile, registration, activity registrations and payments
- a normal member can insert a payment confirmation only for their own account and only with pending status
- a normal member cannot confirm or edit a submitted payment
- an admin can read and manage all reunion data

## Current Limitations

- Zelle and Venmo are handled outside the website. Members submit payment details for review, and a committee/admin user changes `payment_status` from `pending` to `confirmed` after receipt is verified.
- GitHub Pages does not provide runtime environment variables. Use the checked-in empty config for local fallback, edit it manually for testing, or deploy through Cloudflare with the config generation script.
- Supabase live verification requires your project URL, anon key and test Auth users.
