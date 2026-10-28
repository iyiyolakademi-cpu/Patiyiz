-- Patiyiz close-friends stories + independent group chats.
-- Additive migration: existing stories remain 'everyone'; direct messages are untouched.
create table if not exists public.patiyiz_close_friends (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(owner_id,friend_id),
  constraint patiyiz_close_friends_no_self check(owner_id <> friend_id)
);
alter table public.patiyiz_close_friends enable row level security;
revoke all on public.patiyiz_close_friends from public,anon,authenticated;
grant select,insert,delete on public.patiyiz_close_friends to authenticated;
drop policy if exists close_friends_owner_select on public.patiyiz_close_friends;
create policy close_friends_owner_select on public.patiyiz_close_friends for select to authenticated
using (owner_id=(select auth.uid()));
drop policy if exists close_friends_owner_insert on public.patiyiz_close_friends;
create policy close_friends_owner_insert on public.patiyiz_close_friends for insert to authenticated
with check (owner_id=(select auth.uid()) and friend_id<>(select auth.uid()) and
 not public.patiyiz_users_blocked(owner_id,friend_id));
drop policy if exists close_friends_owner_delete on public.patiyiz_close_friends;
create policy close_friends_owner_delete on public.patiyiz_close_friends for delete to authenticated
using (owner_id=(select auth.uid()));

-- Security definer prevents recursive RLS lookups, but ONLY checks the
-- authenticated viewer's OWN membership; no arbitrary people can be queried.
create or replace function public.patiyiz_is_close_friend(p_owner uuid,p_viewer uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select p_viewer=(select auth.uid()) and exists(
  select 1 from public.patiyiz_close_friends
  where owner_id=p_owner and friend_id=p_viewer
 ) and not public.patiyiz_users_blocked(p_owner,p_viewer)
$$;
revoke all on function public.patiyiz_is_close_friend(uuid,uuid) from public,anon;
grant execute on function public.patiyiz_is_close_friend(uuid,uuid) to authenticated;

alter table public.patiyiz_stories
  add column if not exists audience text not null default 'everyone',
  add column if not exists private_image_path text,
  add column if not exists private_video_path text;
alter table public.patiyiz_stories drop constraint if exists patiyiz_stories_audience_safe;
alter table public.patiyiz_stories add constraint patiyiz_stories_audience_safe check(
  (audience='everyone' and private_image_path is null and private_video_path is null)
  or
  (audience='close_friends' and image_url='' and video_url is null
   and private_image_path is not null
   and private_image_path like author_id::text || '/%'
   and (private_video_path is null or private_video_path like author_id::text || '/%'))
);
drop policy if exists patiyiz_stories_read on public.patiyiz_stories;
create policy patiyiz_stories_read on public.patiyiz_stories for select to authenticated
using (
 ((expires_at>now()) or is_highlight=true)
 and not public.patiyiz_users_blocked((select auth.uid()),author_id)
 and (audience='everyone' or author_id=(select auth.uid())
   or public.patiyiz_is_close_friend(author_id,(select auth.uid())))
);
drop policy if exists patiyiz_stories_insert on public.patiyiz_stories;
create policy patiyiz_stories_insert on public.patiyiz_stories for insert to authenticated
with check (author_id=(select auth.uid()) and expires_at>now()
 and expires_at<=now()+interval '24 hours 1 minute');
drop policy if exists patiyiz_stories_update on public.patiyiz_stories;
create policy patiyiz_stories_update on public.patiyiz_stories for update to authenticated
using(author_id=(select auth.uid()))
with check(author_id=(select auth.uid()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('patiyiz-close-stories','patiyiz-close-stories',false,524288000,
 array['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'])
on conflict(id) do update set public=false;
drop policy if exists close_story_owner_upload on storage.objects;
create policy close_story_owner_upload on storage.objects for insert to authenticated
with check(bucket_id='patiyiz-close-stories'
 and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists close_story_authorized_read on storage.objects;
create policy close_story_authorized_read on storage.objects for select to authenticated
using(bucket_id='patiyiz-close-stories' and (
 (storage.foldername(name))[1]=(select auth.uid())::text
 or exists(select 1 from public.patiyiz_stories s
   where (s.private_image_path=name or s.private_video_path=name)
   and s.audience='close_friends'
   and (s.expires_at>now() or s.is_highlight)
   and public.patiyiz_is_close_friend(s.author_id,(select auth.uid())))
));
drop policy if exists close_story_author_delete on storage.objects;
create policy close_story_author_delete on storage.objects for delete to authenticated
using(bucket_id='patiyiz-close-stories'
 and (storage.foldername(name))[1]=(select auth.uid())::text);

-- Group chats live in their OWN tables; private 1:1 messages are unchanged.
create table if not exists public.patiyiz_group_chats (
 id uuid primary key default gen_random_uuid(),
 title text not null check(char_length(btrim(title)) between 1 and 80),
 creator_id uuid not null references public.profiles(id),
 created_at timestamptz not null default now()
);
create table if not exists public.patiyiz_group_members (
 group_id uuid not null references public.patiyiz_group_chats(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 role text not null default 'member' check(role in ('admin','member')),
 joined_at timestamptz not null default now(),
 primary key(group_id,user_id)
);
create index if not exists patiyiz_group_members_lookup on public.patiyiz_group_members(user_id,group_id);
create table if not exists public.patiyiz_group_messages (
 id uuid primary key default gen_random_uuid(),
 group_id uuid not null references public.patiyiz_group_chats(id) on delete cascade,
 sender_id uuid not null references public.profiles(id) on delete cascade,
 body text not null check(char_length(btrim(body)) between 1 and 2000),
 created_at timestamptz not null default now()
);
create index if not exists patiyiz_group_messages_order on public.patiyiz_group_messages(group_id,created_at desc,id desc);
alter table public.patiyiz_group_chats enable row level security;
alter table public.patiyiz_group_members enable row level security;
alter table public.patiyiz_group_messages enable row level security;
revoke all on public.patiyiz_group_chats,public.patiyiz_group_members,public.patiyiz_group_messages from public,anon,authenticated;
grant select on public.patiyiz_group_chats,public.patiyiz_group_members to authenticated;
grant select,insert on public.patiyiz_group_messages to authenticated;

create or replace function public.patiyiz_group_is_member(p_group uuid,p_user uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select p_user=(select auth.uid()) and exists(
  select 1 from public.patiyiz_group_members where group_id=p_group and user_id=p_user
 )
$$;
revoke all on function public.patiyiz_group_is_member(uuid,uuid) from public,anon;
grant execute on function public.patiyiz_group_is_member(uuid,uuid) to authenticated;

drop policy if exists group_chats_members_only on public.patiyiz_group_chats;
create policy group_chats_members_only on public.patiyiz_group_chats for select to authenticated
using(public.patiyiz_group_is_member(id,(select auth.uid())));
drop policy if exists group_members_members_only on public.patiyiz_group_members;
create policy group_members_members_only on public.patiyiz_group_members for select to authenticated
using(public.patiyiz_group_is_member(group_id,(select auth.uid())));
drop policy if exists group_messages_members_only on public.patiyiz_group_messages;
create policy group_messages_members_only on public.patiyiz_group_messages for select to authenticated
using(public.patiyiz_group_is_member(group_id,(select auth.uid())));
drop policy if exists group_messages_send on public.patiyiz_group_messages;
create policy group_messages_send on public.patiyiz_group_messages for insert to authenticated
with check(sender_id=(select auth.uid()) and
 public.patiyiz_group_is_member(group_id,(select auth.uid())));

create or replace function public.patiyiz_create_group_chat(p_title text,p_members uuid[] default '{}'::uuid[])
returns uuid language plpgsql security definer set search_path='' as $$
declare
 v_owner uuid := auth.uid();
 v_group uuid;
 v_id uuid;
begin
 if v_owner is null then raise exception 'Authentication required'; end if;
 if char_length(btrim(coalesce(p_title,''))) not between 1 and 80
 then raise exception 'Group name must be 1-80 characters'; end if;
 if coalesce(array_length(p_members,1),0)>19 then raise exception 'Maximum 20 participants'; end if;
 insert into public.patiyiz_group_chats(title,creator_id) values(btrim(p_title),v_owner)
 returning id into v_group;
 insert into public.patiyiz_group_members(group_id,user_id,role)
 values(v_group,v_owner,'admin');
 for v_id in select distinct unnest(coalesce(p_members,'{}'::uuid[])) loop
  if v_id<>v_owner then
   if public.patiyiz_users_blocked(v_owner,v_id) then raise exception 'User is blocked'; end if;
   insert into public.patiyiz_group_members(group_id,user_id,role)
   values(v_group,v_id,'member');
  end if;
 end loop;
 return v_group;
end;
$$;
revoke all on function public.patiyiz_create_group_chat(text,uuid[]) from public,anon;
grant execute on function public.patiyiz_create_group_chat(text,uuid[]) to authenticated;

create or replace function public.patiyiz_group_remove_member(p_group uuid,p_user uuid)
returns void language plpgsql security definer set search_path='' as $$
declare
 v_caller uuid := auth.uid();
 v_creator uuid;
begin
 if v_caller is null then raise exception 'Authentication required'; end if;
 select creator_id into v_creator from public.patiyiz_group_chats where id=p_group;
 if v_creator is null then raise exception 'Group not found'; end if;
 if p_user=v_creator then raise exception 'Group owner cannot be removed'; end if;
 if v_caller<>p_user and not exists(
  select 1 from public.patiyiz_group_members
  where group_id=p_group and user_id=v_caller and role='admin'
 ) then raise exception 'Only admins may remove another member'; end if;
 delete from public.patiyiz_group_members where group_id=p_group and user_id=p_user;
end;
$$;
revoke all on function public.patiyiz_group_remove_member(uuid,uuid) from public,anon;
grant execute on function public.patiyiz_group_remove_member(uuid,uuid) to authenticated;
