-- Private story audience preferences and backward-compatible editor metadata.
create table public.buchee_story_privacy (
 owner_id uuid primary key references public.profiles(id) on delete cascade,
 hidden_viewers uuid[] not null default '{}',
 constraint buchee_story_hidden_valid check (
  cardinality(hidden_viewers) <= 250 and array_position(hidden_viewers,null) is null
  and not (owner_id=any(hidden_viewers))
 )
);
alter table public.buchee_story_privacy enable row level security;
revoke all on public.buchee_story_privacy from public,anon,authenticated;
grant select,insert,update on public.buchee_story_privacy to authenticated;
create policy buchee_story_privacy_owner on public.buchee_story_privacy
 for all to authenticated
 using (owner_id=(select auth.uid()))
 with check (owner_id=(select auth.uid()));

alter table public.patiyiz_stories
 add column story_text text check (char_length(story_text) <= 160),
 add column story_link_url text check (
  char_length(story_link_url) <= 1000 and story_link_url ~* '^https?://[^[:space:]]+$'
 ),
 add column story_link_label text check (char_length(story_link_label) <= 36),
 add column story_drawing jsonb check (
  jsonb_typeof(story_drawing)='array' and pg_column_size(story_drawing) <= 32768
 );

-- Only evaluate the current viewer's visibility. Keep the preference table owner-only.
create function buchee_story_internal.viewer_not_hidden(p_author uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select (select auth.uid()) is not null and (
  p_author=(select auth.uid()) or not exists (
   select 1 from public.buchee_story_privacy p
   where p.owner_id=p_author and (select auth.uid())=any(p.hidden_viewers)
  )
 )
$$;
revoke all on function buchee_story_internal.viewer_not_hidden(uuid) from public,anon,authenticated;
grant execute on function buchee_story_internal.viewer_not_hidden(uuid) to authenticated;

-- Apply the same visibility rule to the SECURITY DEFINER album listing.
create or replace function buchee_story_internal.can_view(p_author uuid,p_audience text)
returns boolean language sql stable security definer set search_path='' as $$
 select buchee_story_internal.viewer_not_hidden(p_author) and (
  p_author=(select auth.uid()) or (
   not public.patiyiz_users_blocked((select auth.uid()),p_author)
   and (exists(select 1 from public.profiles p where p.id=p_author and not p.is_private)
      or exists(select 1 from public.follows f where f.follower_id=(select auth.uid()) and f.followee_id=p_author))
   and (p_audience='everyone' or (p_audience='close_friends' and public.patiyiz_is_close_friend(p_author,(select auth.uid()))))
  )
 )
$$;

-- Active stories, albums, reactions and Storage policies all consult story visibility.
create policy buchee_story_visibility_exclusions on public.patiyiz_stories
 as restrictive for select to authenticated
 using (buchee_story_internal.viewer_not_hidden(author_id));

-- Preserve the view timestamp RPC and apply the same audience gates before it records anything.
create or replace function public.patiyiz_record_story_view(p_story_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_viewer uuid := auth.uid(); v_owner uuid;
begin
 if v_viewer is null then raise exception 'Oturum gerekli' using errcode='42501'; end if;
 select s.author_id into v_owner from public.patiyiz_stories s
 where s.id=p_story_id and s.expires_at>now()
 and buchee_story_internal.can_view(s.author_id,s.audience);
 if v_owner is null then raise exception 'Hikâyeye erişim yok' using errcode='42501'; end if;
 if v_owner=v_viewer then return; end if;
 insert into public.patiyiz_story_views(story_id,viewer_id,first_viewed_at,last_viewed_at)
 values(p_story_id,v_viewer,now(),now())
 on conflict(story_id,viewer_id) do update
 set last_viewed_at=greatest(public.patiyiz_story_views.last_viewed_at,excluded.last_viewed_at)
 where public.patiyiz_story_views.viewer_id=v_viewer;
end
$$;
