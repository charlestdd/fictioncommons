# Fiction Commons — GREY v0.1

The first MVP of Fiction Commons.

## What works

- Public homepage
- Registration/application form
- Supabase application storage
- Live application statistics
- Admin application dashboard
- Manual approve/reject
- Admin can assign a username during approval
- Basic member login/dashboard foundation

## Setup

1. Create a Supabase project.
2. Open the Supabase SQL Editor.
3. Run `supabase/schema.sql`.
4. Copy your project's public URL and anon key into `assets/config.js`.
5. Serve the folder from a web server (not `file://`).

## Important security note

The requested prototype admin username/password are included in `assets/app.js`:

- username: `g1666136nadmin`
- password: `codenamegray777`

This is intentionally included for the GREY MVP, but it is **not secure** because anyone with access to the open-source frontend can inspect it.

Before public launch, move admin authentication and approval operations to a secure server/Edge Function and rotate the password.

Likewise, do not put a Supabase service-role key in the frontend.

## Planned next

- Real approved-member Auth provisioning
- Member profiles
- Ownership Units
- One Giant Story
- Today's Stories
- Unfinished Business
- Daily Slang
- Competitions
