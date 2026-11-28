# Buchee security review — 2026-11-28

Configured project: Patiyiz. Separate Buchee project is not configured in config.js. Both reported ACTIVE_HEALTHY.

Read-only audit: 110/110 public tables have RLS. Advisors report 22 RLS tables without policies, 63 authenticated-callable SECURITY DEFINER functions, leaked password protection warning, 45 unused indexes, one duplicate index, three auth RLS initplan findings and three multiple permissive policy findings. These are review findings, not confirmed exploits.

Release gates: verify admin and wallet RPC authorization, cross-account DM and private media access, story album visibility, demo isolation, password protection, backups and restore, load tests. Review indexes against real query plans before deletion. Do not migrate projects or change live policies without verified rollback and staging tests.

No production schema or data changes made in this review.
