-- Permit authenticated members to repost their own as well as others' visible posts.
-- User ownership is enforced; the posts RLS read policy still applies.
drop policy if exists repost_add on public.patiyiz_reposts;
create policy repost_add on public.patiyiz_reposts
 for insert to authenticated
 with check (
  user_id=(select auth.uid())
  and exists (select 1 from public.posts p where p.id=patiyiz_reposts.post_id)
 );
