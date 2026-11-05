# Lucasahur Shop — paid course system

This is the starter implementation for Stripe Checkout + email delivery + token-protected course content.

## Architecture

- The public GitHub Pages site displays courses and starts checkout.
- Stripe Checkout collects payment.
- A Cloudflare Worker creates Checkout Sessions and verifies Stripe webhooks.
- Cloudflare D1 stores purchase access records and lesson text.
- Resend sends the buyer a private course access link.
- The static course page asks the Worker to validate that link before showing lesson content.

**Do not put Stripe keys, Resend keys, webhook secrets, or private lesson/video URLs in the public website repository.** Only Worker secrets belong in Cloudflare secrets.

## Important before accepting money

1. Use Stripe test mode first. Do not enable live payments until a parent/guardian has checked the Stripe account representative, payouts, Swedish business/tax requirements, consumer terms, privacy notice and refund policy.
2. You need a domain you control to verify with Resend and use as the sender address. A GitHub Pages URL is not an email-sending domain.
3. Add actual course lessons before publishing a course for sale.
4. The access URL is a bearer link: anyone who receives or is forwarded the link can use it. Buyers should keep the email private. This starter does not yet provide individual accounts, password resets or automatic refund revocation.

## Create Cloudflare resources

1. Create a Cloudflare account.
2. Create a D1 database named `lucasahur-courses`.
3. Copy this folder's `wrangler.toml.example` to `wrangler.toml`.
4. Replace `REPLACE_WITH_D1_DATABASE_ID` with the database ID from Cloudflare.
5. From `course-system/worker`, install Wrangler with `npm install --save-dev wrangler` if needed.
6. Apply the migration: `npx wrangler d1 migrations apply lucasahur-courses --remote`.
7. Deploy: `npx wrangler deploy`.

## Configure Worker variables and secrets

Set these non-secret variables in `wrangler.toml` (or the Cloudflare dashboard):
- `SITE_URL`: exact GitHub Pages site URL, without a trailing slash.
- `SITE_ORIGIN`: origin only, no path.
- `EMAIL_FROM`: a sender address on your Resend-verified domain.
- `PRICE_WEB_FOUNDATIONS` and `PRICE_FIRST_BUSINESS`: Stripe Price IDs.

Add secrets using Wrangler (never commit them):
- `npx wrangler secret put STRIPE_SECRET_KEY` — use an `sk_test_` key while testing.
- `npx wrangler secret put STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret.
- `npx wrangler secret put RESEND_API_KEY` — Resend API key.
- `npx wrangler secret put TOKEN_SECRET` — long random secret, keep it stable; changing it invalidates the deterministic token derivation for future webhook retries.

## Configure Stripe

1. Create products and one-time prices for the courses in Stripe test mode.
2. Copy each Price ID into the matching Worker variable.
3. Add a webhook endpoint: `https://YOUR-WORKER.workers.dev/api/webhook`.
4. Subscribe to `checkout.session.completed`.
5. Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.
6. Test a purchase using Stripe's test card details from the Stripe documentation. Never use a real card while testing.

## Configure Resend

1. Add a domain you own in Resend.
2. Add the DNS records Resend provides and wait until the domain is verified.
3. Create an API key and store it as `RESEND_API_KEY`.
4. Set `EMAIL_FROM` to an address on that verified domain.

## Connect the website

After deploying the Worker, set `COURSE_API_URL` at the top of `course-system/site/course-system.js` to your Worker URL, for example `https://lucasahur-course-api.YOUR-SUBDOMAIN.workers.dev`. Copy the two files in `course-system/site` to the root of the GitHub Pages repository as directed in the main README.

## Add lessons

Insert lesson rows into the D1 `lessons` table. The `content` field is plain text; it is displayed as text, not interpreted as HTML. Keep video URLs private and deliver them only through an authenticated lesson service or a video host with suitable access controls.

## Endpoints

- `POST /api/checkout` with JSON `{"course":"web-foundations"}` or `{"course":"first-business"}`.
- `POST /api/webhook` — Stripe webhook, signature verified.
- `GET /api/course?token=...` — validates the emailed access token and returns lessons.
- `GET /health` — basic health check.

## Known limitations of this starter

- No admin dashboard yet; lessons are added through D1.
- No user accounts; access is via a private emailed link.
- No automated refund/dispute revocation, VAT handling, receipts beyond Stripe's own options, or course progress tracking.
- Add rate limiting / bot protection and a privacy-conscious analytics approach before a public launch.
