# Leave Tracker (GitHub Pages + Supabase)

Starter implementation:
- Multi-user login (Supabase Auth)
- Forgot password (email reset)
- Users: submit leave, see history, see remaining balance (via views)
- Admins: approve/reject, manage employees, edit allowances
- Secure employee creation via Supabase Edge Function (admin-invite)

## Supabase setup (required)
1) Create a Supabase project.

2) Authentication → URL Configuration:
- Site URL: your deployed URL (or http://localhost:5173)
- Redirect URLs: add:
  - http://localhost:5173/reset-password
  - https://<your-gh-pages-domain>/<repo>/reset-password (if GH Pages)

3) Apply schema:
- Run `supabase/sql/schema.sql` in Supabase SQL editor.

## Edge function (recommended) for “Add employee”
- Deploy `supabase/functions/admin-invite/index.ts` as an Edge Function named `admin-invite`.
- Set secrets:
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY (never in frontend)

## First admin user
Fast approach:
- Create a user in Supabase Auth (email/password)
- Insert a row into `employees` with:
  - user_id = the auth user id
  - role = 'admin'
  - email/full_name/code

## Local run
```bash
npm i
cp .env.example .env.local
# edit .env.local values
npm run dev
```

## GitHub Pages deploy
- Settings → Pages → Source: GitHub Actions
- Add repo secrets:
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY

If your GH Pages URL is `https://<user>.github.io/<repo>/`, you may need to set Vite base to `/<repo>/` in `vite.config.ts`.
