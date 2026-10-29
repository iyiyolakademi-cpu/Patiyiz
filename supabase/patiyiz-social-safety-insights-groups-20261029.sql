-- Patiyiz social quality, 29 Oct 2026. Additive; no existing records deleted.
-- Backend-enforced privacy, follow approvals, group admin/photos, creator insights,
-- attributed reactions, moderation controls, and privacy-safe diagnostics.

alter table public.profiles
  add column if not exists is_private boolean not null default false,
  add column if not exists dm_policy text not null default 'everyone',
  add column if not exists blocked_words text[] not null default '{}'::text[];
alter table public.profiles drop constraint if exists patiyiz_dm_policy_check_20261029;
alter table public.profiles add constraint patiyiz_dm_policy_check_20261029
  check (dm_policy in ('everyone','following','none') and cardinality(blocked_words)<=30);
alter table public.posts add column if not exists source_post_id uuid references public.posts(id) on delete set null;
create index if not exists patiyiz_posts_source_20261029 on public.posts(source_post_id) where source_post_id is not null;

create table if not exists public.patiyiz_follow_requests(
 requester_id uuid not null references public.profiles(id) on delete cascade,
 target_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(requester_id,target_id),
 check(requester_id<>target_id)
);
create index if not exists patiyiz_follow_requests_target_20261029
  on public.patiyiz_follow_requests(target_id,created_at desc);
alter table public.patiyiz_follow_requests enable row level security;
revoke all on public.patiyiz_follow_requests from public,anon,authenticated;
grant select on public.patiyiz_follow_requests to authenticated;
drop policy if exists patiyiz_follow_requests_read_20261029 on public.patiyiz_follow_requests;
create policy patiyiz_follow_requests_read_20261029 on public.patiyiz_follow_requests
 for select to authenticated using (
  requester_id=(select auth.uid()) or target_id=(select auth.uid())
 );

-- Private accounts require server-side approval; a direct INSERT cannot bypass requests.
drop policy if exists follows_insert on public.follows;
create policy follows_insert on public.follows for insert to authenticated
with check (
 follower_id=(select auth.uid())
 and not public.patiyiz_users_blocked(follower_id,followee_id)
 and not exists(select 1 from public.profiles p where p.id=followee_id and p.is_private)
);

create or replace function public.patiyiz_follow_action(p_target uuid)
returns text language plpgsql security definer set search_path=''
as $$
declare v_user uuid := auth.uid(); v_private boolean;
begin
 if v_user is null or p_target is null or p_target=v_user then raise exception 'Geçersiz hesap' using errcode='42501'; end if;
 if public.patiyiz_users_blocked(v_user,p_target) then raise exception 'Hesaba erişilemiyor' using errcode='42501'; end if;
 select is_private into v_private from public.profiles where id=p_target;
 if not found then raise exception 'Hesap bulunamadı'; end if;
 if exists(select 1 from public.follows where follower_id=v_user and followee_id=p_target) then
   delete from public.follows where follower_id=v_user and followee_id=p_target;
   return 'unfollowed';
 end if;
 if exists(select 1 from public.patiyiz_follow_requests where requester_id=v_user and target_id=p_target) then
   delete from public.patiyiz_follow_requests where requester_id=v_user and target_id=p_target;
   return 'cancelled';
 end if;
 if v_private then
   insert into public.patiyiz_follow_requests(requester_id,target_id) values(v_user,p_target) on conflict do nothing;
   return 'requested';
 end if;
 insert into public.follows(follower_id,followee_id) values(v_user,p_target) on conflict do nothing;
 return 'following';
end
$$;
revoke all on function public.patiyiz_follow_action(uuid) from public,anon;
grant execute on function public.patiyiz_follow_action(uuid) to authenticated;

create or replace function public.patiyiz_follow_decide(p_requester uuid,p_accept boolean)
returns text language plpgsql security definer set search_path=''
as $$
declare v_owner uuid := auth.uid();
begin
 if v_owner is null then raise exception 'Oturum gerekli' using errcode='42501'; end if;
 if not exists(select 1 from public.patiyiz_follow_requests
               where target_id=v_owner and requester_id=p_requester)
 then raise exception 'Bekleyen istek bulunamadı'; end if;
 if p_accept and not public.patiyiz_users_blocked(v_owner,p_requester) then
   insert into public.follows(follower_id,followee_id) values(p_requester,v_owner)
   on conflict do nothing;
 end if;
 delete from public.patiyiz_follow_requests where target_id=v_owner and requester_id=p_requester;
 return case when p_accept then 'accepted' else 'declined' end;
end
$$;
revoke all on function public.patiyiz_follow_decide(uuid,boolean) from public,anon;
grant execute on function public.patiyiz_follow_decide(uuid,boolean) to authenticated;

drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts for select to authenticated using (
 not public.patiyiz_users_blocked((select auth.uid()),author_id)
 and (author_id=(select auth.uid()) or
      exists(select 1 from public.profiles p where p.id=author_id and not p.is_private) or
      exists(select 1 from public.follows f where f.follower_id=(select auth.uid()) and f.followee_id=author_id))
);
drop policy if exists repost_read on public.patiyiz_reposts;
create policy repost_read on public.patiyiz_reposts for select to authenticated using (
 exists(select 1 from public.posts p where p.id=post_id)
 and not public.patiyiz_users_blocked((select auth.uid()),user_id)
);
drop policy if exists patiyiz_stories_read on public.patiyiz_stories;
create policy patiyiz_stories_read on public.patiyiz_stories for select to authenticated using (
 (expires_at>now() or is_highlight)
 and not public.patiyiz_users_blocked((select auth.uid()),author_id)
 and (author_id=(select auth.uid()) or exists(select 1 from public.profiles p
       where p.id=author_id and not p.is_private)
       or exists(select 1 from public.follows f
       where f.follower_id=(select auth.uid()) and f.followee_id=author_id))
 and (audience='everyone' or author_id=(select auth.uid())
      or public.patiyiz_is_close_friend(author_id,(select auth.uid())))
);
-- Security-definer view logging also checks privacy, independent of RLS.
create or replace function public.patiyiz_record_post_view(p_post_id uuid)
returns bigint language plpgsql security definer set search_path=''
as $$
declare v_user uuid := auth.uid(); v_inserted uuid; v_total bigint;
begin
 if v_user is null then raise exception 'Oturum gerekli' using errcode='42501'; end if;
 if not exists(
  select 1 from public.posts p join public.profiles pr on pr.id=p.author_id
  where p.id=p_post_id and p.author_id<>v_user
  and not public.patiyiz_users_blocked(v_user,p.author_id)
  and (not pr.is_private or exists(select 1 from public.follows f
                where f.followee_id=p.author_id and f.follower_id=v_user))
 ) then return 0; end if;
 insert into public.patiyiz_post_view_events(post_id,viewer_id)
 values(p_post_id,v_user) on conflict do nothing returning viewer_id into v_inserted;
 if v_inserted is not null then
  insert into public.patiyiz_post_view_totals(post_id,view_count)
   values(p_post_id,1) on conflict(post_id)
   do update set view_count=public.patiyiz_post_view_totals.view_count+1
   returning view_count into v_total;
 else
  select view_count into v_total from public.patiyiz_post_view_totals where post_id=p_post_id;
 end if;
 return coalesce(v_total,0);
end
$$;
revoke all on function public.patiyiz_record_post_view(uuid) from public,anon;
grant execute on function public.patiyiz_record_post_view(uuid) to authenticated;

-- Story-view recording must obey the same audience AND account privacy rules,
-- including for SECURITY DEFINER calls made with a guessed story id.
create or replace function public.patiyiz_record_story_view(p_story_id uuid)
returns void language plpgsql security definer set search_path=''
as $$
declare v_viewer uuid := auth.uid(); v_owner uuid;
begin
 if v_viewer is null then raise exception 'Oturum gerekli' using errcode='42501'; end if;
 select s.author_id into v_owner
 from public.patiyiz_stories s join public.profiles pr on pr.id=s.author_id
 where s.id=p_story_id and s.expires_at>now()
 and not public.patiyiz_users_blocked(v_viewer,s.author_id)
 and (s.author_id=v_viewer or not pr.is_private or exists(
   select 1 from public.follows f where f.follower_id=v_viewer and f.followee_id=s.author_id))
 and (s.author_id=v_viewer or s.audience='everyone' or
     (s.audience='close_friends' and public.patiyiz_is_close_friend(s.author_id,v_viewer)));
 if v_owner is null then raise exception 'Hikâyeye erişim yok' using errcode='42501'; end if;
 if v_owner=v_viewer then return; end if;
 insert into public.patiyiz_story_views(story_id,viewer_id,first_viewed_at,last_viewed_at)
 values(p_story_id,v_viewer,now(),now())
 on conflict(story_id,viewer_id) do update
 set last_viewed_at=greatest(public.patiyiz_story_views.last_viewed_at,excluded.last_viewed_at);
end
$$;
revoke all on function public.patiyiz_record_story_view(uuid) from public,anon;
grant execute on function public.patiyiz_record_story_view(uuid) to authenticated;

-- Group photos are stored in a dedicated 1 MB photo bucket. Admins control
-- membership and photo; the creator remains the sole authority to grant admin.
alter table public.patiyiz_group_chats add column if not exists avatar_path text;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('patiyiz-group-avatars','patiyiz-group-avatars',true,1048576,
 array['image/jpeg','image/png','image/webp'])
 on conflict (id) do update set public=true,file_size_limit=1048576,
 allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists patiyiz_group_avatar_upload_20261029 on storage.objects;
create policy patiyiz_group_avatar_upload_20261029 on storage.objects
 for insert to authenticated with check(
 bucket_id='patiyiz-group-avatars'
 and exists(select 1 from public.patiyiz_group_members m
  where m.group_id=((storage.foldername(name))[1])::uuid
    and m.user_id=(select auth.uid()) and m.role='admin')
);
create or replace function public.patiyiz_group_set_photo(p_group uuid,p_path text)
returns void language plpgsql security definer set search_path=''
as $$
declare v_user uuid := auth.uid();
begin
 if v_user is null or not exists(select 1 from public.patiyiz_group_members
  where group_id=p_group and user_id=v_user and role='admin')
 then raise exception 'Yönetici yetkisi gerekli' using errcode='42501'; end if;
 if p_path is not null and (
     p_path not like p_group::text || '/%'
     or not exists(select 1 from storage.objects where bucket_id='patiyiz-group-avatars' and name=p_path)
 ) then raise exception 'Geçersiz grup fotoğrafı' using errcode='42501'; end if;
 update public.patiyiz_group_chats set avatar_path=p_path where id=p_group;
end
$$;
revoke all on function public.patiyiz_group_set_photo(uuid,text) from public,anon;
grant execute on function public.patiyiz_group_set_photo(uuid,text) to authenticated;

create or replace function public.patiyiz_group_set_role(p_group uuid,p_member uuid,p_role text)
returns void language plpgsql security definer set search_path=''
as $$
declare v_owner uuid := auth.uid(); v_creator uuid;
begin
 select creator_id into v_creator from public.patiyiz_group_chats where id=p_group;
 if v_owner is null or v_creator is null or v_owner<>v_creator
 then raise exception 'Yalnızca grup kurucusu yönetici belirleyebilir' using errcode='42501'; end if;
 if p_member=v_creator or p_role not in ('admin','member') then raise exception 'Geçersiz yönetici seçimi'; end if;
 update public.patiyiz_group_members set role=p_role
  where group_id=p_group and user_id=p_member;
 if not found then raise exception 'Grup üyesi bulunamadı'; end if;
end
$$;
revoke all on function public.patiyiz_group_set_role(uuid,uuid,text) from public,anon;
grant execute on function public.patiyiz_group_set_role(uuid,uuid,text) to authenticated;

-- Privacy-safe creator analytics: only the current signed-in author, aggregated.
create table if not exists public.patiyiz_profile_visit_daily(
 profile_id uuid not null references public.profiles(id) on delete cascade,
 viewer_id uuid not null references auth.users(id) on delete cascade,
 visit_day date not null default (now() at time zone 'UTC')::date,
 primary key(profile_id,viewer_id,visit_day)
);
alter table public.patiyiz_profile_visit_daily enable row level security;
revoke all on public.patiyiz_profile_visit_daily from public,anon,authenticated;
create or replace function public.patiyiz_record_profile_visit(p_profile uuid)
returns void language plpgsql security definer set search_path=''
as $$
declare v_user uuid := auth.uid();
begin
 if v_user is null or p_profile=v_user then return; end if;
 if not exists(select 1 from public.profiles where id=p_profile
              and not public.patiyiz_users_blocked(v_user,p_profile)) then return; end if;
 insert into public.patiyiz_profile_visit_daily(profile_id,viewer_id,visit_day)
 values(p_profile,v_user,(now() at time zone 'UTC')::date) on conflict do nothing;
end
$$;
revoke all on function public.patiyiz_record_profile_visit(uuid) from public,anon;
grant execute on function public.patiyiz_record_profile_visit(uuid) to authenticated;

create table if not exists public.patiyiz_reel_watch_daily(
 post_id uuid not null references public.posts(id) on delete cascade,
 viewer_id uuid not null references auth.users(id) on delete cascade,
 watch_day date not null default (now() at time zone 'UTC')::date,
 seconds integer not null default 0 check (seconds between 0 and 900),
 primary key(post_id,viewer_id,watch_day)
);
alter table public.patiyiz_reel_watch_daily enable row level security;
revoke all on public.patiyiz_reel_watch_daily from public,anon,authenticated;
create or replace function public.patiyiz_record_reel_watch(p_post uuid,p_seconds integer)
returns void language plpgsql security definer set search_path=''
as $$
declare v_user uuid := auth.uid();
begin
 if v_user is null or p_seconds is null or p_seconds<1 or p_seconds>30 then return; end if;
 if not exists(select 1 from public.posts p join public.profiles pr on pr.id=p.author_id
  where p.id=p_post and p.video_url is not null and p.author_id<>v_user
    and not public.patiyiz_users_blocked(v_user,p.author_id)
    and (not pr.is_private or exists(select 1 from public.follows f where f.follower_id=v_user and f.followee_id=p.author_id)))
 then return; end if;
 insert into public.patiyiz_reel_watch_daily(post_id,viewer_id,watch_day,seconds)
 values(p_post,v_user,(now() at time zone 'UTC')::date,p_seconds)
 on conflict(post_id,viewer_id,watch_day)
 do update set seconds=least(900,public.patiyiz_reel_watch_daily.seconds+excluded.seconds);
end
$$;
revoke all on function public.patiyiz_record_reel_watch(uuid,integer) from public,anon;
grant execute on function public.patiyiz_record_reel_watch(uuid,integer) to authenticated;

create or replace function public.patiyiz_creator_insights(p_days integer default 30)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_user uuid := auth.uid(); v_days integer := least(greatest(coalesce(p_days,30),7),90);
v_cutoff timestamptz; v_out jsonb;
begin
 if v_user is null then raise exception 'Giriş yapmalısın' using errcode='42501'; end if;
 v_cutoff := now()-(v_days||' days')::interval;
 select jsonb_build_object(
  'days',v_days,
  'profile_visits',(select count(*) from public.patiyiz_profile_visit_daily where profile_id=v_user and visit_day>=v_cutoff::date),
  'followers_now',(select count(*) from public.follows where followee_id=v_user),
  'followers_gained',(select count(*) from public.follows where followee_id=v_user and created_at>=v_cutoff),
  'posts',(select count(*) from public.posts where author_id=v_user and created_at>=v_cutoff),
  'views',(select count(*) from public.patiyiz_post_view_events e join public.posts p on p.id=e.post_id where p.author_id=v_user and e.first_seen_at>=v_cutoff),
  'likes',(select count(*) from public.post_likes l join public.posts p on p.id=l.post_id where p.author_id=v_user and l.created_at>=v_cutoff),
  'saves',(select count(*) from public.post_saves x join public.posts p on p.id=x.post_id where p.author_id=v_user and x.created_at>=v_cutoff),
  'reposts',(select count(*) from public.patiyiz_reposts x join public.posts p on p.id=x.post_id where p.author_id=v_user and x.created_at>=v_cutoff),
  'reel_watch_seconds',(select coalesce(sum(w.seconds),0) from public.patiyiz_reel_watch_daily w join public.posts p on p.id=w.post_id where p.author_id=v_user and w.watch_day>=v_cutoff::date),
  'daily',(select coalesce(jsonb_agg(jsonb_build_object(
   'day',d.day,'followers',(select count(*) from public.follows f where f.followee_id=v_user and f.created_at::date=d.day),
   'likes',(select count(*) from public.post_likes l join public.posts p on p.id=l.post_id where p.author_id=v_user and l.created_at::date=d.day),
   'visits',(select count(*) from public.patiyiz_profile_visit_daily q where q.profile_id=v_user and q.visit_day=d.day)
  ) order by d.day),'[]'::jsonb)
  from (select generate_series((now() at time zone 'UTC')::date-(v_days-1),
     (now() at time zone 'UTC')::date,'1 day'::interval)::date day) d)
 ) into v_out;
 return v_out;
end
$$;
revoke all on function public.patiyiz_creator_insights(integer) from public,anon;
grant execute on function public.patiyiz_creator_insights(integer) to authenticated;

-- Message privacy: optional, backwards compatible by default.
create table if not exists public.patiyiz_restricted_accounts(
 owner_id uuid not null references public.profiles(id) on delete cascade,
 restricted_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(owner_id,restricted_id),
 check(owner_id<>restricted_id)
);
alter table public.patiyiz_restricted_accounts enable row level security;
revoke all on public.patiyiz_restricted_accounts from public,anon,authenticated;
grant select,insert,delete on public.patiyiz_restricted_accounts to authenticated;
drop policy if exists patiyiz_restriction_owner_read_20261029 on public.patiyiz_restricted_accounts;
create policy patiyiz_restriction_owner_read_20261029 on public.patiyiz_restricted_accounts
 for select to authenticated using(owner_id=(select auth.uid()));
drop policy if exists patiyiz_restriction_owner_insert_20261029 on public.patiyiz_restricted_accounts;
create policy patiyiz_restriction_owner_insert_20261029 on public.patiyiz_restricted_accounts
 for insert to authenticated with check(owner_id=(select auth.uid()));
drop policy if exists patiyiz_restriction_owner_delete_20261029 on public.patiyiz_restricted_accounts;
create policy patiyiz_restriction_owner_delete_20261029 on public.patiyiz_restricted_accounts
 for delete to authenticated using(owner_id=(select auth.uid()));

create or replace function public.patiyiz_dm_allowed_20261029(p_sender uuid,p_receiver uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select p_sender=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=p_receiver
   and not exists(select 1 from public.patiyiz_restricted_accounts r
       where r.owner_id=p_receiver and r.restricted_id=p_sender)
   and (p.dm_policy='everyone' or
       (p.dm_policy='following' and exists(select 1 from public.follows f
        where f.follower_id=p_receiver and f.followee_id=p_sender))))
$$;
revoke all on function public.patiyiz_dm_allowed_20261029(uuid,uuid) from public,anon;
grant execute on function public.patiyiz_dm_allowed_20261029(uuid,uuid) to authenticated;
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
with check (
 sender_id=(select auth.uid()) and not public.patiyiz_users_blocked(sender_id,receiver_id)

 and public.patiyiz_dm_allowed_20261029(sender_id,receiver_id)
);
-- Prevent unauthorized source attribution on a fake/hidden video reaction.
create or replace function public.patiyiz_guard_reaction_20261029()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if new.source_post_id is null then return new; end if;
 if new.source_post_id=new.id or new.video_url is null then raise exception 'Tepki Reels için video gereklidir'; end if;
 if not exists(
   select 1 from public.posts p join public.profiles pr on pr.id=p.author_id
   where p.id=new.source_post_id and p.author_id<>new.author_id
   and not public.patiyiz_users_blocked(new.author_id,p.author_id)
   and (not pr.is_private or exists(select 1 from public.follows f
              where f.followee_id=p.author_id and f.follower_id=new.author_id))
 ) then raise exception 'Bu gönderiye tepki verilemiyor' using errcode='42501'; end if;
 return new;
end
$$;
drop trigger if exists patiyiz_guard_reaction_insert_20261029 on public.posts;
create trigger patiyiz_guard_reaction_insert_20261029 before insert or update of source_post_id
 on public.posts for each row execute function public.patiyiz_guard_reaction_20261029();

-- Diagnostic counters are intentionally aggregate: no user text, URL, stack, email or IP.
create table if not exists public.patiyiz_client_error_daily(
 user_id uuid not null references auth.users(id) on delete cascade,
 error_day date not null default (now() at time zone 'UTC')::date,
 kind text not null check(kind in ('script','promise','asset')),
 occurrences int not null default 0 check(occurrences between 0 and 20),
 primary key(user_id,error_day,kind)
);
alter table public.patiyiz_client_error_daily enable row level security;
revoke all on public.patiyiz_client_error_daily from public,anon,authenticated;
create or replace function public.patiyiz_track_client_error(p_kind text)
returns void language plpgsql security definer set search_path=''
as $$
declare v_user uuid := auth.uid();
begin
 if v_user is null or p_kind not in ('script','promise','asset') then return; end if;
 insert into public.patiyiz_client_error_daily(user_id,error_day,kind,occurrences)
 values(v_user,(now() at time zone 'UTC')::date,p_kind,1)
 on conflict(user_id,error_day,kind) do update
 set occurrences=least(20,public.patiyiz_client_error_daily.occurrences+1);
end
$$;
revoke all on function public.patiyiz_track_client_error(text) from public,anon;
grant execute on function public.patiyiz_track_client_error(text) to authenticated;

-- Server-enforced moderation of abusive comment bursts and chosen keywords.
create or replace function public.patiyiz_guard_comment_20261029()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_words text[]; v_word text;
begin
 if auth.uid() is null or new.author_id<>auth.uid() then raise exception 'Oturum gerekli' using errcode='42501'; end if;
 if (select count(*) from public.comments where author_id=new.author_id
      and created_at>now()-interval '1 minute')>=35
 then raise exception 'Çok hızlı yorum yapıyorsun. Biraz sonra yeniden dene.'; end if;
 select p.blocked_words into v_words from public.posts post join public.profiles p on p.id=post.author_id
 where post.id=new.post_id;
 foreach v_word in array coalesce(v_words,'{}'::text[]) loop
   if length(trim(v_word))>=3 and position(lower(trim(v_word)) in lower(new.body))>0
   then raise exception 'Yorum içerik sahibinin filtresine takıldı.'; end if;
 end loop;
 return new;
end
$$;
drop trigger if exists patiyiz_guard_comment_insert_20261029 on public.comments;
create trigger patiyiz_guard_comment_insert_20261029 before insert on public.comments
for each row execute function public.patiyiz_guard_comment_20261029();

-- Only adult users are currently eligible to register (existing 18+ gate);
-- do not falsely market this as a verified age-assurance system.
