# Hayes Family Reunion Website Prototype

This is an initial static website draft for the Hayes Family Reunion in Charleston, South Carolina. It uses HTML, CSS and JavaScript so it can be published with GitHub Pages.

## Files

- `index.html`: Save the Date landing page
- `home.html`: homepage with reunion details
- `location.html`: Charleston location and travel details
- `itinerary.html`: August 31 - September 3 activity outline
- `registration.html`: household registration form prototype
- `updates.html`: reunion announcements and committee updates
- `media.html`: photo gallery and family legacy media
- `contact.html`: planning committee contact page
- `member.html`: secure member portal with live household registration details
- `committee.html`: fictional committee dashboard preview
- `styles.css`: shared responsive styling and color variables
- `script.js`: mobile menu, countdown and prototype button behavior
- `js/`: Supabase client modules for auth, member dashboard, committee dashboard, registration and payment foundations
- `supabase/migrations/001_initial_schema.sql`: reproducible Supabase schema and Row Level Security setup
- `supabase/migrations/002_household_member_management.sql`: household member management fields and RLS updates
- `supabase/migrations/003_banquet_meal_choice.sql`: per-attendee banquet meal and attendee status fields
- `docs/supabase-setup.md`: Supabase setup, environment and testing documentation
- `assets/charleston-hero.webp`: Charleston hero image
- `assets/charlotte-skyline.png`: earlier Charlotte image retained in the project
- `assets/hayes-family-reunion-logo.svg`: color text logo
- `assets/hayes-family-reunion-logo-light.svg`: white text logo for the hero
- `assets/hayes-reunion-hero.png`: earlier generated placeholder image retained in the project

## Editing Reunion Details

Most placeholder details are written directly in `index.html`. Search for `To Be Announced`, `Demo`, or `Placeholder` to find items the planning committee can replace later.

Common updates:

- Host hotel name, address, room block link and booking deadline
- Registration deadline and dues deadline
- Adult, teen and child pricing
- Committee email address
- Weekend schedule times, locations and descriptions
- Private family group links
- Family history, tributes and approved photos

## Publishing With GitHub Pages

1. Add these files to a GitHub repository.
2. In GitHub, open the repository settings.
3. Go to Pages.
4. Choose the branch that contains the site files.
5. Select the repository root as the publishing folder.
6. Save, then wait for GitHub Pages to provide the website link.

## Cloudflare Deployment

Cloudflare automatic deployment is configured from the GitHub repository. New commits pushed to `main` will trigger a Cloudflare build and deployment.

## Future Integrations

This draft now includes the foundation for Supabase authentication, member data, committee/admin data and manual payment tracking. It does not add a payment processor.

The member portal stores each attendee's category, T-shirt size and banquet meal choice on their `family_members` record. The authenticated primary account holder uses their existing linked record and is included in the household registration count.

- Gmail or another approved email workflow for committee messages

Never place Supabase secret keys, Stripe secret keys, service-role keys or API credentials in client-side website files.
