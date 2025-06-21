This project is named 'Parkbench'.
The idea is that Parkbench will provide an interface for parents to "check in" themselves or their kids at a park. Other parents can then view who is at each park and use it to decide where to go.

The initial audience for this app is friends and family in my specific neighborhood, but it could be expanded to other neighborhoods in the future. Because the audience is limited, I'm intending to keep the feature set and user experience very lean to start.

# Technology notes

- React-router v7 (ex-Remix) will be the core technology on both client and server
- Prisma for the database
- Tailwind for styling
- Vite for development
- ESlint, prettier for code (Airbnb config with eslint-plugin-prettier)
- Vitest, and cypress for testing
- TODO: Need to find a deployment location / CI/CD pipeline

# Data model

## Common fields

- All models have UUIDs for IDs
- All models have created_at and updated_at timestamps
- All timestamps are UTC
- All models are soft-deleted and have deleted_at timestamps

## Models

- Location (a park where a visitor can be checked in)
  - Fields: Name, nickname
  - Relationships: Check-in
- Check-in (A user checks in a visitor at a location for an optional duration)
  - Fields: Location ID, visitor ID, check-in time, estimated check-out time, actual check-out time
  - Relationships: Location, Visitor
  - UNIQUE constraint (visitor_id, actual_checkout_time IS NULL) so one visitor can’t be “at” two parks.
  - Composite index on (visitor_id, actual_checkout_time)
- User (a person with an account on the site. They can check in visitors)
  - Fields: Name, email
  - Relationships: Check-in
- Visitor (a person checked in at a location by a User)
  - Fields: Name, owning user ID
  - Relationships: Check-in, User

# Pages

- Main page
  - List of parks, each with a sub-list of visitors and how long each visitor has been at the park (and how much time until they leave, in theory)
  - The checked-in users will refetch every 15 seconds
  - The list of visitors will be sorted alphabetically
  - The list of parks will be sorted alphabetically
  - A button to check in visitors at a park
- Registration page
  - The user will be prompted to enter their email address
  - The user will be prompted to enter their name
  - The user will be prompted to optionally enter any additional visitors by name
  - All required fields must be filled out before the Register button is enabled
  - The user will click the Register button to register.
  - On the backend, we will check if the email address already exists. If it does, we will return an error. If it doesn't, we will create a new user and optionally any visitors, then return a Success message, the user's email address, and list of visitors to the frontend. The front-end will store this in local-storage and redirect the user to the check-in page
  - We will omit a password for now
- Sign-in page
  - The user will be prompted to enter their email address
  - The backend will generate a single-use magic-link token (valid for 15 minutes) and email it to the user
  - The user clicks the magic link, which opens the Magic Link callback page, verifies the token, and signs them in
  - Upon successful verification the backend returns the user's email address and list of visitors; the front-end stores this in localStorage and redirects to the check-in page
- Magic Link callback page
  - This page is opened when the user clicks the magic link in their email
  - The page sends the token to the backend for verification
  - On success, localStorage is populated with the user's email and visitors and the user is redirected to the check-in page
  - On failure (expired/invalid), display an error and link back to the Sign-in page
- Sign-out page
  - The user will click the Sign-out button to sign out. This will clear local-storage and redirect the user to the main page.
- Check-in page
  - If the user has not signed in, they will be prompted to either register on the registration page, or sign in on the sign-in page
  - If the user has signed in, they will be prompted to choose the visitors to check in and the park to check them in at
  - A multi-select list of the user's visitors to choose from
  - A single-select list of parks to choose from
  - An optional duration dropdown (in 15-minute chunks up to 4 hours)
  - A Submit button that's enabled once the user has selected at least one visitor and a park
  - The user will click the Submit button to check in the visitors at the park. The backend will create a check-in record for each visitor. If an existing check-in record exists for the visitor at the park, the backend will update the existing check-in to set the actual checkout time. The backend will then redirect the user to the main page.
  - This page should have a deep-linkable URL by park that can be printed as a QR code and placed at the park
- Check-out page
  - The user will select one or more visitors who are currently checked-in at a park
  - A button to check out the visitors at a park. The button will be enabled once the user has selected at least one visitor
  - The user will click the Submit button to check out the visitors at the park. The backend will update the check-in record for each visitor to set the actual checkout time. The backend will then redirect the user to the main page.
  - This page should have a deep-linkable URL by park that can be printed as a QR code and placed at the park
- There will be no Park admin interface

# Backend

A cron job will run every 15 minutes to check for any checked-in children whose checkout time has passed. Any expired check-ins will be updated to set the actual checkout time.

Magic-link authentication workflow:

- When a user submits the Sign-in form, the backend creates a `magic_link_token` (UUID), stores it with the associated user ID and an `expires_at` timestamp (15 minutes) in the database, and emails a link containing the token to the user.
- The Magic Link callback endpoint (`/auth/magic`) verifies that the token exists, has not expired, and has not already been used. If valid, it consumes the token, creates a session (httpOnly cookie), and returns the user’s profile and visitors.
- Invalid or expired tokens return an error response used by the front-end to prompt the user to request a new link.

# Potential future features

- Simple password or gmail authentication
- Parents can check children in based on their current location (using geolocation)
- Friends and / or private groups to limit visibility of check-ins
- Auto-checkout when the user leaves the area
- Should we auto-check out visitors when the user logs out?
- Rate limiting for registration and login
- Email verification for registration
- Store user ID / email in httpOnly cookies and use CSRF tokens for authentication
- Switch to DB-level TTL trigger or Postgres pgcron to avoid a separate worker.
- Search and favourites for visitors AND locations
- Multiple guardians for same visitor (divorced parents).
