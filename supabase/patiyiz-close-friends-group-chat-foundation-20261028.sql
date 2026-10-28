-- Patiyiz social expansion: close friends and independent group conversations.
-- This migration is intentionally additive. No existing messages, posts or stories are modified.
-- Apply only after reviewing in the correct Supabase project.

create table if not exists public.patiyiz_close_friends (
 owner_id uuid not null references public.profiles(id) on delete cascade,
 friend_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(owner_id,friend_id),
 constraint patiyiz_close_friends_no_self check(owner_id <> friend_id)
);
create index if not exists patiyiz_close_friends_friend_idx on public.patiyiz_close_friends(friend_id);
alter table public.patiyiz_close_friends enable row level security;
revoke all on public.patiyiz_close_friends from public,anon,authenticated;
grant select,insert,delete on public.patiyiz_close_friends to authenticated;
drop policy if exists patiyiz_close_friends_select on public.patiyiz_close_friends;
create policy patiyiz_close_friends_select on public.patiyiz_close_friends for select to authenticated
using(owner_id=(select auth.uid()));
drop policy if exists patiyiz_close_friends_insert on public.patiyiz_close_friends;
create policy patiyiz_close_friends_insert on public.patiyiz_close_friends for insert to authenticated
with check(owner_id=(select auth.uid()) and friend_id<>(select auth.uid()));
drop policy if exists patiyiz_close_friends_delete on public.patiyiz_close_friends;
create policy patiyiz_close_friends_delete on public.patiyiz_close_friends for delete to authenticated
using(owner_id=(select auth.uid()));

-- Future story audience integration must use a security-definer helper; simply
-- hiding story cards in the UI does NOT protect private stories.
create or replace function public.patiyiz_is_close_friend(p_owner uuid,p_viewer uuid)
returns boolean language sql stable security definer
set search_path=public,pg_temp as $$
 select exists(select 1 from public.patiyiz_close_friends f
 where f.owner_id=p_owner and f.friend_id=p_viewer)
 and (p_viewer=auth.uid() or p_owner=auth.uid())
$$;
revoke all on function public.patiyiz_is_close_friend(uuid,uuid) from public,anon;
grant execute on function public.patiyiz_is_close_friend(uuid,uuid) to authenticated;

-- Group chats live alongside, NOT inside, the existing one-to-one DM tables.
create table if not exists public.patiyiz_group_chats (
 id uuid primary key default gen_random_uuid(),
 title text not null check(char_length(btrim(title)) between 1 and 80),
 creator_id uuid not null references public.profiles(id) on delete restrict,
 created_at timestamptz not null default now()
);
create table if not exists public.patiyiz_group_members (
 group_id uuid not null references public.patiyiz_group_chats(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 role text not null default 'member' check(role in ('admin','member')),
 joined_at timestamptz not null default now(),
 primary key(group_id,user_id)
);
create index if not exists patiyiz_group_members_user_idx on public.patiyiz_group_members(user_id,group_id);
create table if not exists public.patiyiz_group_messages (
 id uuid primary key default gen_random_uuid(),
 group_id uuid not null references public.patiyiz_group_chats(id) on delete cascade,
 sender_id uuid not null references public.profiles(id) on delete cascade,
 body text not null check(char_length(btrim(body)) between 1 and 2000),
 created_at timestamptz not null default now()
);
create index if not exists patiyiz_group_messages_order_idx on public.patiyiz_group_messages(group_id,created_at desc,id desc);

-- Membership lookup bypasses recursive membership RLS. Do not expose group
-- member lists to strangers or re-use direct-message access checks here.
create or replace function public.patiyiz_group_is_member(p_group uuid,p_user uuid)
returns boolean language sql stable security definer
set search_path=public,pg_temp as $$
 select exists(select 1 from public.patiyiz_group_members
 where group_id=p_group and user_id=p_user)
 and p_user=auth.uid()
$;
revoke all on function public.patiyiz_group_is_member(uuid,uuid) from public,anon;
grant execute on function public.patiyiz_group_is_member(uuid,uuid) to authenticated;

-- Creator is the only user allowed to create a group. Membership administration
-- must later be performed through an atomic, permission-checked RPC, never by
-- giving ordinary users unrestricted INSERT into patiyiz_group_members.
alter table public.patiyiz_group_chats enable row level security;
alter table public.patiyiz_group_members enable row level security;
alter table public.patiyiz_group_messages enable row level security;
revoke all on public.patiyiz_group_chats,public.patiyiz_group_members,public.patiyiz_group_messages from public,anon,authenticated;
grant select,insert on public.patiyiz_group_chats to authenticated;
grant select on public.patiyiz_group_members to authenticated;
grant select,insert on public.patiyiz_group_messages to authenticated;
drop policy if exists patiyiz_group_chat_select on public.patiyiz_group_chats;
create policy patiyiz_group_chat_select on public.patiyiz_group_chats for select to authenticated
using(public.patiyiz_group_is_member(id,(select auth.uid())));
drop policy if exists patiyiz_group_chat_insert on public.patiyiz_group_chats;
create policy patiyiz_group_chat_insert on public.patiyiz_group_chats for insert to authenticated
with check(creator_id=(select auth.uid()));
drop policy if exists patiyiz_group_members_select on public.patiyiz_group_members;
create policy patiyiz_group_members_select on public.patiyiz_group_members for select to authenticated
using(public.patiyiz_group_is_member(group_id,(select auth.uid())));
drop policy if exists patiyiz_group_messages_select on public.patiyiz_group_messages;
create policy patiyiz_group_messages_select on public.patiyiz_group_messages for select to authenticated
using(public.patiyiz_group_is_member(group_id,(select auth.uid())));
drop policy if exists patiyiz_group_messages_insert on public.patiyiz_group_messages;
create policy patiyiz_group_messages_insert on public.patiyiz_group_messages for insert to authenticated
with check(sender_id=(select auth.uid()) and public.patiyiz_group_is_member(group_id,(select auth.uid())));

-- A transactional creation RPC creates the owner membership and group together.
create or replace function public.patiyiz_create_group_chat(p_title text)
returns uuid language plpgsql security definer
set search_path=public,pg_temp as $$
declare
 v_owner uuid := auth.uid();
 v_group uuid;
begin
 if v_owner is null then raise exception 'Authentication required'; end if;
 if char_length(btrim(coalesce(p_title,''))) not between 1 and 80 then raise exception 'Invalid group name'; end if;
 insert into public.patiyiz_group_chats(title,creator_id) values(btrim(p_title),v_owner) returning id into v_group;
 insert into public.patiyiz_group_members(group_id,user_id,role) values(v_group,v_owner,'admin');
 return v_group;
end;
$$;
revoke all on function public.patiyiz_create_group_chat(text) from public,anon;
grant execute on function public.patiyiz_create_group_chat(text) to authenticated;

create or replace function public.patiyiz_group_add_member(p_group uuid,p_user uuid)
returns void language plpgsql security definer
set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from public.patiyiz_group_members
   where group_id=p_group and user_id=auth.uid() and role='admin') then
  raise exception 'Only group admins can add members';
 end if;
 if p_user=auth.uid() then raise exception 'Already a member'; end if;
 if exists(select 1 from public.patiyiz_group_members where group_id=p_group and user_id=p_user) then return; end if;
 insert into public.patiyiz_group_members(group_id,user_id,role) values(p_group,p_user,'member');
end;
$$;
revoke all on function public.patiyiz_group_add_member(uuid,uuid) from public,anon;
grant execute on function public.patiyiz_group_add_member(uuid,uuid) to authenticated;

-- NOT YET INCLUDED: audience column + story RLS transition, membership removal,
-- attachments, unread state, notifications and moderation. These require
-- separate release/testing; do not expose this incomplete feature to users.
