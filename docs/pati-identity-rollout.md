# Patiyiz — Pati Kimliği delivery and security checklist (30 October 2026)

## Status
An isolated code review branch from main, NOT a production release. The connected Supabase project was verified as **Patiyiz** and its existing pets columns were checked. The QR SQL migration was applied to the connected Patiyiz project and the original function was deployed. This branch now uses **Patiyiz's free self-hosted HMAC-signed arithmetic challenge** instead of Cloudflare. Publish only after the replacement Edge deployment and checks pass.

## Functional boundaries
- Existing `pets` are the source of identity; owner must own the pet.
- Existing social DM and `lost_reports` behavior is unchanged.
- Scan landing page: `https://patiyiz.com/pati-kimligi.html#<random-token>`.
- Raw QR token is returned only on create/rotate; SHA-256 hash is stored server side. Reprinting requires rotating the token, invalidating the older printed tag.
- The public scan response contains ONLY name, species, breed, opt-in photo (OFF by default) and manually approved public note; never owner ID, phone, email, health records or full address.
- Anonymous finders answer a short arithmetic question in an HMAC-signed, five-minute, single-use challenge. A hidden honeypot, per-visitor limits and total QR-tag message limits offer practical anti-spam protection. This is weaker than a managed CAPTCHA against determined automated attackers; monitor abuse.
- Finder receives a private receipt secret as part of a URL fragment and can read only that conversation. Owner can reply from own Pati Identity dashboard; do not mix finder messages with normal `messages` table.
- Threads expire after 30 days and must later be purged by a scheduled retention job, following user consent/privacy policy updates.

## Deploy prerequisite steps
1. Verify the SQL assumptions for `public.pets.id` and `public.pets.owner_id`, review `docs/pati-identity-schema-proposal.sql`, and apply the approved SQL to the **Patiyiz** project, not another Supabase instance. Follow the project's migration naming and rollout practice.
2. Deploy `supabase/functions/pati-identity/index.ts` to the Patiyiz project. This one endpoint accepts anonymous scan/contacts and must be configured with **verify_jwt=false**; all `owner-*` requests separately validate the user JWT with Auth and validate pet ownership.
3. No third-party CAPTCHA account or secret is needed. The HMAC signer uses optional server-only `PATI_RATE_PEPPER`, otherwise Supabase's built-in service-role secret. Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the Edge Function. **Do not expose any secret in config.js, GitHub, or the browser.**
4. The public scan is hosted on patiyiz.com and has a standalone, accessible arithmetic challenge with a renewal button. Patiyiz Capacitor's https://localhost is an approved API origin for **owner-authorized actions**. Challenge expiry, invalid signatures, replay, honeypot and per-tag limits must be tested.
5. Ensure patiyiz.com actually serves `pati-kimligi.html` (and that privacy/terms reflect QR messaging, contact retention, and finder safety).
6. Confirm service_role is never in public HTML, scan payload or client logs. Confirm anon/authenticated cannot SELECT/UPDATE/INSERT/DELETE identity tables directly except owner-only SELECT granted under RLS.
7. Validate owner-list, create, rotate, toggle, lookup, finder send, owner reply, finder read, blocked QR, bad token, IP abuse, expired thread, multiple animals, account deletion and lost pet handoff.
8. Test real iOS/Android camera scans and QR downloads and the Capacitor build. `qrcodejs@1.0.0` currently loads from a pinned CDN; consider vendoring the asset to guarantee offline QR rendering and reduce supply-chain dependency.
9. Integrate owner alert/push delivery **after** verifying `notifications` and `push_subscriptions` schema. Current MVP has a secure inbox with manual refresh, not a confirmed real-time push notification.
10. The two Supabase `pg_cron` cleanup jobs are installed and active: daily expired-thread deletion (message rows cascade) and daily stale rate-limit cleanup. Document data retention, abuse reporting and legal basis.

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

## Additional review fixes
- The Edge handler rate-limits both visitor requests and per-tag messages; the QR global cap is applied only after a valid challenge so invalid anonymous requests cannot exhaust it without solving a challenge.
- All contact requests require a valid HMAC signature tied to the QR tag, a correct answer, and an unused five-minute nonce. The secret stays exclusively on the server. This approach has **no recurring third-party CAPTCHA fee** (normal Supabase resource quotas still apply).

## Free protection acceptance (30 October 2026)
- The public form never sends contact details until the owner QR and one-time challenge are validated.
- Challenge is signed with HMAC SHA-256 and expires in five minutes, then consumed with the existing atomic `pati_identity_throttle` RPC.
- Challenge verification is enforced server-side; scripts cannot bypass it by removing the input or calling the Edge Function directly without a valid solved challenge.
- Manual arithmetic is not sophisticated bot detection. Deployers must monitor spam and can temporarily disable any compromised QR with `owner-toggle`.
- Cloudflare is **not** required and no paid external CAPTCHA account is part of the system.

## Verified production infrastructure
- `pati-identity` Edge Function **v2** deployed ACTIVE on the dedicated Patiyiz Supabase project; no Cloudflare integration.
- Identity tables and owner-only RLS live; no public browser write privileges.
- Existing project `pg_cron` extension runs `pati_identity_expired_threads_daily` and `pati_identity_expired_limiter_daily` (verified active).
- Confirm actual QR scan / finder contact with two phones and owner/finder accounts after website deployment. Automated unit/static CI does not replace device integration tests.
