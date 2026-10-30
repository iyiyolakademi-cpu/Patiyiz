# Patiyiz — Pati Kimliği delivery and security checklist (30 October 2026)

## Status
A code review branch, NOT a production release. Patiyiz's Supabase project was not available among the connected Supabase projects, so no live SQL, Edge deployment, push integration, or production device verification has been performed. Do not merge before these steps are complete.

## Functional boundaries
- Existing `pets` are the source of identity; owner must own the pet.
- Existing social DM and `lost_reports` behavior is unchanged.
- Scan landing page: `https://patiyiz.com/pati-kimligi.html#<random-token>`.
- Raw QR token is returned only on create/rotate; SHA-256 hash is stored server side. Reprinting requires rotating the token, invalidating the older printed tag.
- The public scan response contains ONLY name, species, breed, opt-in photo (OFF by default) and manually approved public note; never owner ID, phone, email, health records or full address.
- Anonymous finders submit text after a Cloudflare Turnstile challenge; server-side IP/tag rate-limit protects against repeated requests.
- Finder receives a private receipt secret as part of a URL fragment and can read only that conversation. Owner can reply from own Pati Identity dashboard; do not mix finder messages with normal `messages` table.
- Threads expire after 30 days and must later be purged by a scheduled retention job, following user consent/privacy policy updates.

## Deploy prerequisite steps
1. Verify the SQL assumptions for `public.pets.id` and `public.pets.owner_id`, review `docs/pati-identity-schema-proposal.sql`, and apply the approved SQL to the **Patiyiz** project, not another Supabase instance. Follow the project's migration naming and rollout practice.
2. Deploy `supabase/functions/pati-identity/index.ts` to the Patiyiz project. This one endpoint accepts anonymous scan/contacts and must be configured with **verify_jwt=false**; all `owner-*` requests separately validate the user JWT with Auth and validate pet ownership.
3. Configure server-only secrets `PATI_TURNSTILE_SECRET`, `PATI_TURNSTILE_SITE`, `PATI_RATE_PEPPER`; `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are supplied by the server environment. **Do not store secrets in config.js, GitHub, or the browser.**
4. Cloudflare Turnstile site hostnames must include patiyiz.com (and the approved GitHub Pages preview hostname, if testing there). Without both keys the form correctly remains disabled.
5. Ensure patiyiz.com actually serves `pati-kimligi.html` (and that privacy/terms reflect QR messaging, contact retention, and finder safety).
6. Confirm service_role is never in public HTML, scan payload or client logs. Confirm anon/authenticated cannot SELECT/UPDATE/INSERT/DELETE identity tables directly except owner-only SELECT granted under RLS.
7. Validate owner-list, create, rotate, toggle, lookup, finder send, owner reply, finder read, blocked QR, bad token, IP abuse, expired thread, multiple animals, account deletion and lost pet handoff.
8. Test real iOS/Android camera scans and QR downloads and the Capacitor build. `qrcodejs@1.0.0` currently loads from a pinned CDN; consider vendoring the asset to guarantee offline QR rendering and reduce supply-chain dependency.
9. Integrate owner alert/push delivery **after** verifying `notifications` and `push_subscriptions` schema. Current MVP has a secure inbox with manual refresh, not a confirmed real-time push notification.
10. Add a periodic cleanup job for expired threads/messages and stale rate limit records. Document data retention, abuse reporting and legal basis before launch.

## Design and code boundaries
- DM work in `patiyiz-design-system-20261030.css` changes CSS only: no new message functions.
- Media CSS avoids hard-coded 9:16 black sidebars, keeps image aspect ratios, and improves thumbnails.
- `patiyiz-insights-metrics.js` moves safe number/change helpers out of the giant app file. Unavailable metrics are shown as unavailable; follower net change is explicitly withheld if historical loss tracking is incomplete.
- Full app.js and legacy CSS decomposition is **not finished**; this branch is an incremental, safer first step. A future targeted refactor should separate feed, DM, creator, pets, health, and engagement logic with regression tests, remove superseded styles only once visual parity is proven, and avoid making performance claims without device measurements.

## Release acceptance
- Two test accounts: own vs. another user's QR and threads; finder unauthenticated.
- Anonymous cannot enumerate pets or look up a tag without a 256-bit secret.
- Disabled/rotated tag no longer resolves.
- Owner identity and pet health data never appear in network responses to anonymous visitors.
- 7/30/90 statistics: no invented sample, follower loss history limitations clearly displayed.
- Dark/light DM styling, full width media, mobile input safe area, actual Android/iOS regression.
- Play Store build updated separately; merging a GitHub PR does not update installed apps.
