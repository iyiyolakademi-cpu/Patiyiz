-- Patiyiz DM + Creator Studio expansion, 29 Oct 2026
-- Additive migration: retains all existing posts, messages and attachments.

-- 1. Message scheduling; sender can manage only own, undelivered messages.
create table if not exists public.patiyiz_scheduled_messages (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references public.profiles(id) on delete cascade,
 receiver_id uuid not null references public.profiles(id) on delete cascade,
 body text not null check (char_length(btrim(body)) between 1 and 1000),
 send_at timestamptz not null,
 created_at timestamptz not null default now(),
 status text not null default 'pending' check (status in ('pending','sent','failed','cancelled')),
 sent_message_id uuid references public.messages(id) on delete set null,
 error_code text,
 constraint patiyiz_scheduled_not_self check (sender_id <> receiver_id)
);
create index if not exists patiyiz_scheduled_due_idx
 on public.patiyiz_scheduled_messages(send_at) where status='pending';
create index if not exists patiyiz_scheduled_owner_idx
 on public.patiyiz_scheduled_messages(sender_id,send_at desc);
alter table public.patiyiz_scheduled_messages enable row level security;
revoke all on table public.patiyiz_scheduled_messages from public,anon,authenticated;
grant select,insert,delete on table public.patiyiz_scheduled_messages to authenticated;
drop policy if exists patiyiz_scheduled_select_20261029 on public.patiyiz_scheduled_messages;
create policy patiyiz_scheduled_select_20261029 on public.patiyiz_scheduled_messages
 for select to authenticated using(sender_id=(select auth.uid()));
drop policy if exists patiyiz_scheduled_insert_20261029 on public.patiyiz_scheduled_messages;
create policy patiyiz_scheduled_insert_20261029 on public.patiyiz_scheduled_messages
 for insert to authenticated with check (
 sender_id=(select auth.uid()) and status='pending' and sent_message_id is null and error_code is null
 and send_at between now()+interval '1 minute' and now()+interval '30 days'
 and not public.patiyiz_users_blocked(sender_id,receiver_id)
 and public.patiyiz_dm_allowed_20261029(sender_id,receiver_id)
);
drop policy if exists patiyiz_scheduled_delete_20261029 on public.patiyiz_scheduled_messages;
create policy patiyiz_scheduled_delete_20261029 on public.patiyiz_scheduled_messages
 for delete to authenticated using(sender_id=(select auth.uid()) and status='pending');

-- Cron dispatcher is not exposed as an anonymous RPC endpoint.
-- It checks the present relationship and message preferences at actual delivery time.
create schema if not exists patiyiz_private;
create or replace function patiyiz_private.dispatch_scheduled_messages()
returns integer language plpgsql security definer set search_path=''
as $body$
declare m record; delivered uuid; delivered_count integer := 0;
begin
 for m in
  select * from public.patiyiz_scheduled_messages
  where status='pending' and send_at <= now()
  order by send_at, id limit 40 for update skip locked
 loop
  if public.patiyiz_users_blocked(m.sender_id,m.receiver_id)
   or not exists(
    select 1 from public.profiles pr where pr.id=m.receiver_id and
     (pr.dm_policy='everyone' or
       (pr.dm_policy='following' and exists(
        select 1 from public.follows f
        where f.follower_id=m.receiver_id and f.followee_id=m.sender_id
       )))
     and not exists(
      select 1 from public.patiyiz_restricted_accounts r
      where r.owner_id=m.receiver_id and r.restricted_id=m.sender_id
     )
   )
  then
   update public.patiyiz_scheduled_messages
   set status='failed',error_code='recipient_unavailable' where id=m.id;
   continue;
  end if;
  begin
   insert into public.messages(sender_id,receiver_id,body)
   values(m.sender_id,m.receiver_id,m.body) returning id into delivered;
   update public.patiyiz_scheduled_messages
   set status='sent',sent_message_id=delivered where id=m.id;
   delivered_count:=delivered_count+1;
  exception when others then
   update public.patiyiz_scheduled_messages
   set status='failed',error_code='delivery_failed' where id=m.id;
  end;
 end loop;
 return delivered_count;
end
$body$;
revoke all on function patiyiz_private.dispatch_scheduled_messages() from public,anon,authenticated;
-- Existing pg_cron extension is used for the pet reminders on this project.
select cron.schedule('patiyiz-scheduled-dms','* * * * *',
  'select patiyiz_private.dispatch_scheduled_messages();');

-- 1b. Each participant can set their own visual theme for a DM.
create table if not exists public.patiyiz_dm_themes(
 viewer_id uuid not null references public.profiles(id) on delete cascade,
 peer_id uuid not null references public.profiles(id) on delete cascade,
 theme text not null default 'classic'
   check(theme in ('classic','midnight','lavender','ocean','rose')),
 updated_at timestamptz not null default now(),
 primary key(viewer_id,peer_id),
 constraint patiyiz_dm_themes_no_self check(viewer_id<>peer_id)
);
alter table public.patiyiz_dm_themes enable row level security;
revoke all on public.patiyiz_dm_themes from public,anon,authenticated;
grant select,insert,update,delete on public.patiyiz_dm_themes to authenticated;
drop policy if exists patiyiz_dm_theme_select_20261029 on public.patiyiz_dm_themes;
create policy patiyiz_dm_theme_select_20261029 on public.patiyiz_dm_themes
 for select to authenticated using(viewer_id=(select auth.uid()));
drop policy if exists patiyiz_dm_theme_insert_20261029 on public.patiyiz_dm_themes;
create policy patiyiz_dm_theme_insert_20261029 on public.patiyiz_dm_themes
 for insert to authenticated with check(viewer_id=(select auth.uid()));
drop policy if exists patiyiz_dm_theme_update_20261029 on public.patiyiz_dm_themes;
create policy patiyiz_dm_theme_update_20261029 on public.patiyiz_dm_themes
 for update to authenticated using(viewer_id=(select auth.uid()))
 with check(viewer_id=(select auth.uid()));

-- 2. Comment pinning: one pinned comment per post, chosen by post owner.
create table if not exists public.patiyiz_comment_pins (
 post_id uuid primary key references public.posts(id) on delete cascade,
 comment_id uuid not null unique references public.comments(id) on delete cascade,
 owner_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.patiyiz_comment_pins enable row level security;
revoke all on table public.patiyiz_comment_pins from public,anon,authenticated;
grant select,insert,update,delete on table public.patiyiz_comment_pins to authenticated;
drop policy if exists patiyiz_comment_pin_read_20261029 on public.patiyiz_comment_pins;
create policy patiyiz_comment_pin_read_20261029 on public.patiyiz_comment_pins
 for select to authenticated using(
   exists(select 1 from public.posts p where p.id=post_id)
 );
drop policy if exists patiyiz_comment_pin_insert_20261029 on public.patiyiz_comment_pins;
create policy patiyiz_comment_pin_insert_20261029 on public.patiyiz_comment_pins
 for insert to authenticated with check(
  owner_id=(select auth.uid())
  and exists(select 1 from public.posts p where p.id=post_id and p.author_id=owner_id)
  and exists(select 1 from public.comments c where c.id=comment_id and c.post_id=post_id)
 );
drop policy if exists patiyiz_comment_pin_update_20261029 on public.patiyiz_comment_pins;
create policy patiyiz_comment_pin_update_20261029 on public.patiyiz_comment_pins
 for update to authenticated using(owner_id=(select auth.uid()))
 with check(
  owner_id=(select auth.uid())
  and exists(select 1 from public.posts p where p.id=post_id and p.author_id=owner_id)
  and exists(select 1 from public.comments c where c.id=comment_id and c.post_id=post_id)
 );
drop policy if exists patiyiz_comment_pin_delete_20261029 on public.patiyiz_comment_pins;
create policy patiyiz_comment_pin_delete_20261029 on public.patiyiz_comment_pins
 for delete to authenticated using(owner_id=(select auth.uid()));

-- 3. A post can contain several videos, while preserving the original
-- single video_url column and old readers. Max 4 video URLs/post.
alter table public.posts add column if not exists post_format text not null default 'post';
alter table public.posts drop constraint if exists patiyiz_post_format_check_20261029;
alter table public.posts add constraint patiyiz_post_format_check_20261029 check(post_format in ('post','reels'));
alter table public.posts add column if not exists media_videos text[] not null default '{}';
alter table public.posts drop constraint if exists patiyiz_media_videos_limit_20261029;
alter table public.posts add constraint patiyiz_media_videos_limit_20261029
 check(cardinality(media_videos)<=4);

-- 4. Animated GIF media in existing PRIVATE DM bucket.
-- Existing private storage RLS, message sender validation and 8MB limit remain.
update storage.buckets set
 allowed_mime_types=array_append(allowed_mime_types,'image/gif')
 where id='patiyiz-private-messages' and not ('image/gif'=any(allowed_mime_types));
