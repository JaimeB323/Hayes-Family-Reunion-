# Hayes Family Reunion Website Prototype

This is an initial static website draft for the Hayes Family Reunion in Charleston, South Carolina. It uses HTML, CSS and JavaScript so it can be published with GitHub Pages.

## Files

- `index.html`: homepage with reunion details
- `location.html`: Charleston location and travel details
- `itinerary.html`: August 31 - September 3 activity outline
- `registration.html`: household registration form prototype
- `updates.html`: reunion announcements and committee updates
- `media.html`: photo gallery and family legacy media
- `contact.html`: planning committee contact page
- `member.html`: fictional secure member portal preview
- `committee.html`: fictional committee dashboard preview
- `styles.css`: shared responsive styling and color variables
- `script.js`: mobile menu, countdown and prototype button behavior
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

## Future Integrations

This first draft does not collect payments, send emails, store member records or use real authentication. Future versions can add:

- Supabase authentication and household registration data
- Stripe payment checkout through a secure backend
- Gmail or another approved email workflow for committee messages

Never place Supabase secret keys, Stripe secret keys, service-role keys or API credentials in client-side website files.
