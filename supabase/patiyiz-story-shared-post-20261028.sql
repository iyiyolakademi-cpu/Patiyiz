-- Optional attribution for reposting a public post to a 24-hour story.
-- Preserve existing story media, permissions and expiry behaviour.
alter table public.patiyiz_stories
 add column if not exists shared_post_id uuid references public.posts(id) on delete set null;
create index if not exists patiyiz_stories_shared_post_idx on public.patiyiz_stories(shared_post_id)
 where shared_post_id is not null;