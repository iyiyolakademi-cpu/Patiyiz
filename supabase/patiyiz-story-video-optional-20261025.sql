-- Applied to the live Patiyiz Supabase project 2026-10-25.
-- Video stories reuse image_url for their preview poster to preserve older clients.
alter table public.patiyiz_stories add column if not exists video_url text;
comment on column public.patiyiz_stories.video_url is 'Optional short story video; image_url remains the compatibility cover for older clients.';