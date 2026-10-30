-- Self-hosted QR messaging data retention, executed within the existing Patiyiz Supabase project.
-- Finder thread messages cascade-delete together with expired 30-day threads.
-- Keep rate-limit counters long enough to enforce daily/one-time challenges.
SELECT cron.schedule('pati_identity_expired_threads_daily','13 4 * * *',
  'DELETE FROM public.pati_identity_threads WHERE expires_at < now()');
SELECT cron.schedule('pati_identity_expired_limiter_daily','17 4 * * *',
  'DELETE FROM public.pati_identity_rate_limits WHERE window_started_at < now() - interval ''2 days''');
