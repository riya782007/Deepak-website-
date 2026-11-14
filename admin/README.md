# Soft Binomials admin console

The staff console for day-to-day operations: enquiries, admissions, fees and receipts, batches and attendance, trainers and payouts, corporate workshops, and Excel import and export. It is served at `/admin/` and built with the website (`npm run build`).

Website content (services, case studies, leadership, history, insights) is managed separately in Sanity, as set out in the website proposal. This console handles operations only.

## Two modes

| Mode | When | Data |
| --- | --- | --- |
| Demo | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` not set | Sample records in the visitor's browser only. **Reset demo data** restores them. Safe for showing the console. |
| Live | Both variables set at build time | Supabase database in Soft Binomials' name. Each person signs in with their own work email. |

Run it locally with `npm run dev` and open http://127.0.0.1:5173/admin/.

## Going live (about 30 minutes)

1. **Create the database.** Sign in to supabase.com with a company email (not a personal one) and create a project in the **South Asia (Mumbai)** region. Keep the database password in the company password manager.
2. **Create the tables and permissions.** Open SQL Editor, paste `supabase/migrations/0001_operations_console.sql` and run it.
3. **Sign-in emails.** Under Authentication → URL Configuration, add the console address (for example `https://admin.yourdomain.in/admin/`) to *Redirect URLs*. Under Authentication → SMTP, connect the company mail service. Supabase's built-in mailer is limited to a few emails an hour, which is enough for testing but not for daily use.
4. **Connect the build.** Copy `.env.example` to `.env.local` (or set the same variables in Cloudflare Pages) using Project Settings → API: the project URL and the `anon` public key. Never use the `service_role` key in this project.
5. **Make the first owner.** Open the console, sign in with the owner's email, then run this in SQL Editor:
   `update public.staff set role = 'owner' where email = 'owner@yourcompany.in';`
6. **Add the team.** Each person opens the console and signs in. They appear in Setup → Team and roles as *Pending* with no access until the owner picks a role.
7. **Bring in existing data.** Use **Import from Excel** on Enquiries, Students and Trainers. In demo mode, use **Remove sample data** in Setup first.

## Roles

| Role | Can |
| --- | --- |
| Owner | Everything, including changing roles. There must always be at least one owner. |
| Admin | Add, edit and delete records; read the audit trail |
| Staff | Add and edit records; cannot delete |
| Viewer | Read only |
| Pending | Nothing until the owner assigns a role |

Every change to students, payments, payouts, trainers and corporate workshops is recorded in `audit_log` (who, when, before and after). Only admins and owners can read it.

## Website enquiries

When the website is built with the same two variables, the contact form adds each enquiry to the console's Enquiries board as **New**, source **Website**. Row-level security lets website visitors add a New enquiry and nothing else: they cannot read, edit or delete any record. Add Cloudflare Turnstile to the form before launch to stop spam (see the proposal).

## How data is stored

Each table (`enquiries`, `students`, `programmes`, `batches`, `trainers`, `payments`, `payouts`, `engagements`, `config`) holds one JSON document per row. That matches how the console works and lets fields be added without migrations. Partial updates go through `patch_doc`, which merges nested objects (for example a day's attendance) and replaces lists. Live updates use Supabase Realtime, so two people see each other's changes without refreshing.

## Tests

`npm test` runs the database script against a real Postgres engine (PGlite) and checks every role, the website form permission, the audit trail and the last-owner guard. The live store (`store-supabase.js`) has not yet been tested against a hosted Supabase project; do that as the first step after step 4.

## Known issue

ExcelJS depends on an older `uuid` package that `npm audit` flags as moderate. The issue only applies when a caller passes its own buffer to uuid v3/v5/v6, which ExcelJS doesn't do. Recheck when ExcelJS releases a new version.
