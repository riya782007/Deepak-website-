# Soft Binomials admin console

The staff console for day-to-day operations: enquiries, admissions, fees and receipts, batches and attendance, trainers and payouts, corporate workshops, and Excel import and export. It is served at `/admin/` and built with the website (`npm run build`).

Website content (services, case studies, leadership, history, insights) is managed separately in Sanity, as set out in the website proposal. This console handles operations only.

## Two modes

| Mode | When | Data |
| --- | --- | --- |
| Demo | `VITE_CONSOLE_API_URL`, `VITE_AWS_REGION` and `VITE_COGNITO_CLIENT_ID` not set | Sample records in the visitor's browser only. **Reset demo data** restores them. Safe for showing the console. |
| Live | All three set at build time | AWS account in Soft Binomials' name, Mumbai region. Each person signs in with their own email and password. |

Run it locally with `npm run dev` and open http://127.0.0.1:5173/admin/.

## What runs on AWS, and what it costs

Everything is in `infra/template.yaml` (one CloudFormation stack, region **ap-south-1, Mumbai**). It is designed to stay inside AWS's always-free allowances at this console's size, so the expected bill is close to zero.

| Piece | Service | Free allowance (every month, not just the first year) |
| --- | --- | --- |
| Sign-in | Cognito, Lite tier | 10,000 monthly active users |
| Data | DynamoDB, one table with 5 read and 5 write units (plus 5 and 5 for its index) | 25 GB and 25 read / 25 write units |
| API | One Lambda function with its own web address (no API Gateway) | 1 million requests |
| Website and console | Private S3 bucket behind CloudFront | 1 TB of traffic and 10 million requests |
| Logs | CloudWatch, kept 14 days | 5 GB |
| Cost alert | AWS Budgets | Free |

Small costs that can appear: S3 storage for the site (a few rupees a month at most) and point-in-time backup of the table (cents for this much data). There are no servers, NAT gateways, firewalls or Route 53 zones that bill by the hour. The budget alert emails `AlertEmail` if the month's spend passes half of `MonthlyBudgetUsd` (US$2 by default) or is forecast to pass all of it.

Live updates poll for changes every 15 seconds while the console tab is open, and stop when it is hidden. Five people working a full day use about 10,000 API requests, about 1% of the free allowance.

**Account note.** AWS accounts opened after 15 July 2025 choose a Free or Paid plan at sign-up. A Free-plan account closes after six months or when its credits run out, so open the company account on the **Paid** plan; the always-free allowances above still apply.

## Going live

1. **Open the AWS account** in Soft Binomials' name (company email, company card, Paid plan). Turn on multi-factor sign-in for the root user and create an admin user for day-to-day work.
2. **Deploy.** With the AWS CLI signed in to that account:
   `ALERT_EMAIL=accounts@yourcompany.in ./infra/deploy.sh`
   This creates the stack, uploads the API code, builds the site with the right settings and publishes it.
   **Later updates deploy themselves:** `.github/workflows/deploy.yml` runs on every push to `main` (and `admin-console` while it is open). It signs in to AWS with short-lived credentials through the `sb-github-deploy` role, so no AWS keys are stored in GitHub. It needs one repository variable, `AWS_ROLE_ARN`, set to the stack output `DeployRoleArn`.
3. **Make the first owner.** In the AWS console open Cognito → user pool `sb-console-staff` → Create user, with the owner's email and "Send an email invitation". Then add that user to the `owner` group. (The console's own Invite button does the same for everyone after that.)
4. **Add the team.** The owner opens Setup → Team and roles and invites each person with a role. They get an email with a temporary password and choose their own the first time. Pick **No access** to switch someone off; this also signs them out everywhere within 30 minutes.
5. **Bring in existing data.** Use **Import from Excel** on Enquiries, Students and Trainers.
6. **Custom domain (optional).** Request a free certificate in ACM (us-east-1) for, say, `www.softbinomials.in`, add it and the domain to the CloudFront distribution, point the domain's DNS at CloudFront at your registrar, and pass `EXTRA_ORIGINS=https://www.softbinomials.in` to `deploy.sh` so the website form can reach the API.

Cognito's built-in email is limited to 50 emails a day, which covers invitations and password resets for a small team. If that ever runs short, connect Amazon SES.

## Roles

| Role | Can |
| --- | --- |
| Owner | Everything, including inviting people and changing roles. There must always be at least one owner. |
| Admin | Add, edit and delete records; read the audit trail and the team list |
| Staff | Add and edit records; cannot delete |
| Viewer | Read only |
| No access | Signed out and blocked until the owner picks a role |

Every change to students, payments, payouts, trainers and corporate workshops is recorded in an audit trail (who, when, before and after). Only admins and owners can read it (`GET /audit`).

## Website enquiries

When the website is built with `VITE_CONSOLE_API_URL`, the contact form posts to the API's public route, which rebuilds the record on the server as a **New** enquiry from **Website**; it can't set any other field or touch other records. A hidden honeypot field drops simple bots. Add reCAPTCHA or Cloudflare Turnstile before launch if spam appears.

## How data is stored

One DynamoDB table holds one JSON document per record, keyed by collection and id. Partial updates merge nested objects (for example a day's attendance) and replace lists, and two people saving the same record at once both keep their changes. Deleted records leave a marker for 30 days so every open console removes them, then DynamoDB clears it for free.

## Tests

`npm test` runs the API against in-memory stand-ins for DynamoDB and Cognito with real signed tokens: every role, merges, simultaneous saves, the change feed, deletions, the audit trail, the last-owner guard and the website route. The template is checked with `cfn-lint`.

## Known issue

ExcelJS depends on an older `uuid` package that `npm audit` flags as moderate. The issue only applies when a caller passes its own buffer to uuid v3/v5/v6, which ExcelJS doesn't do. Recheck when ExcelJS releases a new version.
