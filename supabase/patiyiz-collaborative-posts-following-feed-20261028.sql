-- Patiyiz: collaboration invitations and a strictly authenticated following timeline.
-- Existing posts, followers and media records are not changed.
create table if not exists public.patiyiz_post_collaborators (
 post_id uuid not null references public.posts(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 invited_by uuid not null references public.profiles(id) on delete cascade,
 status text not null default 'pending' check (status in ('pending','accepted','declined')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint patiyiz_post_collaborators_pkey primary key (post_id, user_id),
 constraint patiyiz_post_collaborators_one_partner unique(post_id),
 constraint patiyiz_post_collaborators_not_self check (user_id <> invited_by)
);
create index if not exists patiyiz_collaborator_user_status_idx
 on public.patiyiz_post_collaborators(user_id,status,created_at desc);
alter table public.patiyiz_post_collaborators enable row level security;
-- Do not assume default public table grants: Data API access is explicitly scoped.
revoke all on table public.patiyiz_post_collaborators from public, anon, authenticated;
grant select,insert,delete on table public.patiyiz_post_collaborators to authenticated;
grant update(status) on table public.patiyiz_post_collaborators to authenticated;
drop policy if exists patiyiz_collab_read on public.patiyiz_post_collaborators;
create policy patiyiz_collab_read on public.patiyiz_post_collaborators
 for select to authenticated
 using (
  (select auth.uid()) = user_id or (select auth.uid()) = invited_by
  or (status = 'accepted'
   and not public.patiyiz_users_blocked((select auth.uid()),user_id)
   and not public.patiyiz_users_blocked((select auth.uid()),invited_by))
 );
drop policy if exists patiyiz_collab_invite on public.patiyiz_post_collaborators;
create policy patiyiz_collab_invite on public.patiyiz_post_collaborators
 for insert to authenticated
 with check (
  (select auth.uid()) = invited_by
  and user_id <> invited_by
  and status = 'pending'
  and not public.patiyiz_users_blocked(invited_by,user_id)
  and exists(select 1 from public.posts p where p.id=post_id and p.author_id=invited_by)
 );
drop policy if exists patiyiz_collab_respond on public.patiyiz_post_collaborators;
create policy patiyiz_collab_respond on public.patiyiz_post_collaborators
 for update to authenticated
 using (user_id=(select auth.uid()) and status='pending')
 with check (user_id=(select auth.uid()) and status in ('accepted','declined'));
drop policy if exists patiyiz_collab_remove on public.patiyiz_post_collaborators;
create policy patiyiz_collab_remove on public.patiyiz_post_collaborators
 for delete to authenticated
 using (invited_by=(select auth.uid()) or user_id=(select auth.uid()));

-- The authenticated caller's RLS policies on posts/follows/collaborators still apply.
create or replace function public.patiyiz_following_feed(
 p_limit integer default 40,
 p_before timestamptz default null,
 p_before_id uuid default null
)
returns setof public.posts
language sql stable security invoker
set search_path = ''
as $$
 select p.*
 from public.posts p
 where auth.uid() is not null
   and (
     p.author_id = auth.uid()
     or exists (
       select 1 from public.follows f
       where f.follower_id=auth.uid() and f.followee_id=p.author_id
     )
     or exists (
       select 1 from public.patiyiz_post_collaborators c
       join public.follows f on f.followee_id=c.user_id and f.follower_id=auth.uid()
       where c.post_id=p.id and c.status='accepted'
     )
   )
   and (p_before is null or (p.created_at,p.id)<(p_before,p_before_id))
 order by p.created_at desc,p.id desc
 limit least(greatest(coalesce(p_limit,40),1),60);
$$;
revoke all on function public.patiyiz_following_feed(integer,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.patiyiz_following_feed(integer,timestamptz,uuid) to authenticated;
