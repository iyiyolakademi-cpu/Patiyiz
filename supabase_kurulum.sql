-- PATIYIZ | Supabase SQL Editor: bu dosyayı YENİ bir Supabase projesinde tek kez çalıştırın.
-- Kullanıcı verisi tutan tablolarda RLS aktiftir. service_role anahtarını asla HTML/GitHub'a koymayın.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default 'Patiyiz Üyesi' check(char_length(display_name) between 2 and 70),
 handle text not null unique check(handle ~ '^[a-z0-9_]{3,24}$'),
 bio text not null default '' check(char_length(bio)<=500),
 city text not null default '' check(char_length(city)<=80),
 avatar_url text,
 created_at timestamptz not null default now()
);
create or replace function public.create_new_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles (id,display_name,handle)
 values (new.id, left(coalesce(nullif(btrim(new.raw_user_meta_data->>'display_name'),''),'Patiyiz Üyesi'),70), 'patiyiz_'||replace(substr(new.id::text,1,13),'-',''))
 on conflict (id) do nothing;
 return new;
end; $$;
drop trigger if exists on_auth_user_created_patiyiz on auth.users;
create trigger on_auth_user_created_patiyiz after insert on auth.users for each row execute function public.create_new_profile();

create table if not exists public.pets (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
 name text not null check(char_length(name) between 1 and 60),
 species text not null check(char_length(species)<=35), age text not null default '',
 breed text not null default '', personality text not null default '', notes text not null default '',
 photo_url text, created_at timestamptz not null default now()
);
create index if not exists pets_owner_idx on public.pets(owner_id);

create table if not exists public.posts (
 id uuid primary key default gen_random_uuid(), author_id uuid not null references public.profiles(id) on delete cascade,
 pet_id uuid references public.pets(id) on delete set null,
 body text not null check(char_length(btrim(body)) between 1 and 1500),
 image_url text, species text not null default 'Diğer', created_at timestamptz not null default now()
);
create index if not exists posts_created_idx on public.posts(created_at desc);

create table if not exists public.post_likes (
 user_id uuid not null references public.profiles(id) on delete cascade,
 post_id uuid not null references public.posts(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(user_id,post_id)
);
create table if not exists public.post_saves (
 user_id uuid not null references public.profiles(id) on delete cascade,
 post_id uuid not null references public.posts(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(user_id,post_id)
);
create table if not exists public.comments (
 id uuid primary key default gen_random_uuid(), post_id uuid not null references public.posts(id) on delete cascade,
 author_id uuid not null references public.profiles(id) on delete cascade,
 body text not null check(char_length(btrim(body)) between 1 and 750),
 created_at timestamptz not null default now()
);
create index if not exists comments_post_idx on public.comments(post_id);

create table if not exists public.follows (
 follower_id uuid not null references public.profiles(id) on delete cascade,
 followee_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(follower_id, followee_id),
 check(follower_id<>followee_id)
);

create table if not exists public.questions (
 id uuid primary key default gen_random_uuid(), author_id uuid not null references public.profiles(id) on delete cascade,
 category text not null default 'Genel', title text not null check(char_length(btrim(title)) between 5 and 150),
 body text not null check(char_length(btrim(body)) between 5 and 2000),
 created_at timestamptz not null default now()
);
create table if not exists public.replies (
 id uuid primary key default gen_random_uuid(), question_id uuid not null references public.questions(id) on delete cascade,
 author_id uuid not null references public.profiles(id) on delete cascade,
 body text not null check(char_length(btrim(body)) between 1 and 1000), created_at timestamptz not null default now()
);
create table if not exists public.question_votes (
 user_id uuid not null references public.profiles(id) on delete cascade,
 question_id uuid not null references public.questions(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(user_id,question_id)
);

create table if not exists public.lost_reports (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
 name text not null check(char_length(btrim(name)) between 1 and 60),
 species text not null, city text not null check(char_length(btrim(city)) between 2 and 80),
 district text not null default '', last_seen date not null,
 description text not null check(char_length(btrim(description)) between 10 and 1200),
 photo_url text, found boolean not null default false, created_at timestamptz not null default now()
);
create index if not exists lost_reports_date_idx on public.lost_reports(created_at desc);
create table if not exists public.care_tasks (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
 pet_id uuid references public.pets(id) on delete cascade,
 title text not null check(char_length(btrim(title)) between 2 and 100),
 category text not null default 'Bakım', due_date date not null,
 done boolean not null default false, created_at timestamptz not null default now()
);

create table if not exists public.messages (
 id uuid primary key default gen_random_uuid(), sender_id uuid not null references public.profiles(id) on delete cascade,
 receiver_id uuid not null references public.profiles(id) on delete cascade,
 body text not null check(char_length(btrim(body)) between 1 and 1000),
 created_at timestamptz not null default now(), read_at timestamptz,
 check(sender_id<>receiver_id)
);
create index if not exists messages_sent_idx on public.messages(sender_id,created_at desc);
create index if not exists messages_received_idx on public.messages(receiver_id,created_at desc);

create table if not exists public.notifications (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
 actor_id uuid references public.profiles(id) on delete set null, kind text not null,
 text text not null, read boolean not null default false, created_at timestamptz not null default now()
);
create index if not exists notifications_owner_idx on public.notifications(owner_id,created_at desc);
create table if not exists public.kb_bookmarks (
 user_id uuid not null references public.profiles(id) on delete cascade,
 article_id text not null check(char_length(article_id)<=50), created_at timestamptz not null default now(),
 primary key(user_id,article_id)
);
create table if not exists public.user_blocks (
 blocker_id uuid not null references public.profiles(id) on delete cascade,
 blocked_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(blocker_id,blocked_id),
 check(blocker_id<>blocked_id)
);
create table if not exists public.content_reports (
 id uuid primary key default gen_random_uuid(), reporter_id uuid not null references public.profiles(id) on delete cascade,
 content_type text not null check(content_type in ('post','question','lost','profile','comment')),
 content_id uuid not null, reason text not null check(char_length(btrim(reason)) between 5 and 500),
 created_at timestamptz not null default now()
);

-- Engelleme kuralı RLS üzerinden tek taraflı gizlenmesin diye güvenli yardımcı.
create or replace function public.patiyiz_users_blocked(a uuid,b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select case when (select auth.uid()) in (a,b) then exists(
  select 1 from public.user_blocks
  where (blocker_id=a and blocked_id=b) or (blocker_id=b and blocked_id=a)
 ) else true end
$$;
revoke all on function public.patiyiz_users_blocked(uuid,uuid) from public,anon;
grant execute on function public.patiyiz_users_blocked(uuid,uuid) to authenticated;

-- Public API: giriş yapanlar yalnızca gerekli tabloları kullanabilir.
do $$ declare t text; begin
 foreach t in array array['profiles','pets','posts','post_likes','post_saves','comments','follows','questions','replies','question_votes','lost_reports','care_tasks','messages','notifications','kb_bookmarks','user_blocks','content_reports'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
 end loop;
end $$;
grant usage on schema public to authenticated;
grant select on public.profiles,public.pets,public.posts,public.post_likes,public.comments,public.follows,public.questions,public.replies,public.question_votes,public.lost_reports to authenticated;
grant update(display_name,handle,bio,city,avatar_url) on public.profiles to authenticated;
grant insert,update,delete on public.pets,public.posts,public.comments,public.questions,public.replies,public.lost_reports to authenticated;
grant insert,delete on public.post_likes,public.post_saves,public.follows,public.question_votes,public.kb_bookmarks,public.user_blocks to authenticated;
grant select on public.post_saves,public.kb_bookmarks,public.user_blocks to authenticated;
grant select,insert,update,delete on public.care_tasks to authenticated;
grant select,insert on public.messages to authenticated;
grant select,update(read) on public.notifications to authenticated;
grant insert,select on public.content_reports to authenticated;

create policy "profiles_select" on public.profiles for select to authenticated using(true);
create policy "profiles_update" on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy "pets_select" on public.pets for select to authenticated using(true);
create policy "pets_insert" on public.pets for insert to authenticated with check(owner_id=(select auth.uid()));
create policy "pets_update" on public.pets for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy "pets_delete" on public.pets for delete to authenticated using(owner_id=(select auth.uid()));
create policy "posts_select" on public.posts for select to authenticated using(true);
create policy "posts_insert" on public.posts for insert to authenticated with check(author_id=(select auth.uid()) and (pet_id is null or exists (select 1 from public.pets where id=pet_id and owner_id=(select auth.uid()))));
create policy "posts_update" on public.posts for update to authenticated using(author_id=(select auth.uid())) with check(author_id=(select auth.uid()) and (pet_id is null or exists (select 1 from public.pets where id=pet_id and owner_id=(select auth.uid()))));
create policy "posts_delete" on public.posts for delete to authenticated using(author_id=(select auth.uid()));
create policy "likes_select" on public.post_likes for select to authenticated using(true);
create policy "likes_insert" on public.post_likes for insert to authenticated with check(user_id=(select auth.uid()));
create policy "likes_delete" on public.post_likes for delete to authenticated using(user_id=(select auth.uid()));
create policy "saves_select" on public.post_saves for select to authenticated using(user_id=(select auth.uid()));
create policy "saves_insert" on public.post_saves for insert to authenticated with check(user_id=(select auth.uid()));
create policy "saves_delete" on public.post_saves for delete to authenticated using(user_id=(select auth.uid()));
create policy "comments_select" on public.comments for select to authenticated using(true);
create policy "comments_insert" on public.comments for insert to authenticated with check(author_id=(select auth.uid()));
create policy "comments_update" on public.comments for update to authenticated using(author_id=(select auth.uid())) with check(author_id=(select auth.uid()));
create policy "comments_delete" on public.comments for delete to authenticated using(author_id=(select auth.uid()));
create policy "follows_select" on public.follows for select to authenticated using(true);
create policy "follows_insert" on public.follows for insert to authenticated with check(follower_id=(select auth.uid()) and not public.patiyiz_users_blocked(follower_id,followee_id));
create policy "follows_delete" on public.follows for delete to authenticated using(follower_id=(select auth.uid()));
create policy "questions_select" on public.questions for select to authenticated using(true);
create policy "questions_insert" on public.questions for insert to authenticated with check(author_id=(select auth.uid()));
create policy "questions_update" on public.questions for update to authenticated using(author_id=(select auth.uid())) with check(author_id=(select auth.uid()));
create policy "questions_delete" on public.questions for delete to authenticated using(author_id=(select auth.uid()));
create policy "replies_select" on public.replies for select to authenticated using(true);
create policy "replies_insert" on public.replies for insert to authenticated with check(author_id=(select auth.uid()));
create policy "replies_update" on public.replies for update to authenticated using(author_id=(select auth.uid())) with check(author_id=(select auth.uid()));
create policy "replies_delete" on public.replies for delete to authenticated using(author_id=(select auth.uid()));
create policy "votes_select" on public.question_votes for select to authenticated using(true);
create policy "votes_insert" on public.question_votes for insert to authenticated with check(user_id=(select auth.uid()));
create policy "votes_delete" on public.question_votes for delete to authenticated using(user_id=(select auth.uid()));
create policy "lost_select" on public.lost_reports for select to authenticated using(true);
create policy "lost_insert" on public.lost_reports for insert to authenticated with check(owner_id=(select auth.uid()));
create policy "lost_update" on public.lost_reports for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy "lost_delete" on public.lost_reports for delete to authenticated using(owner_id=(select auth.uid()));
create policy "care_select" on public.care_tasks for select to authenticated using(owner_id=(select auth.uid()));
create policy "care_insert" on public.care_tasks for insert to authenticated with check(owner_id=(select auth.uid()) and (pet_id is null or exists(select 1 from public.pets where id=pet_id and owner_id=(select auth.uid()))));
create policy "care_update" on public.care_tasks for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()) and (pet_id is null or exists(select 1 from public.pets where id=pet_id and owner_id=(select auth.uid()))));
create policy "care_delete" on public.care_tasks for delete to authenticated using(owner_id=(select auth.uid()));
create policy "messages_select" on public.messages for select to authenticated using(sender_id=(select auth.uid()) or receiver_id=(select auth.uid()));
create policy "messages_insert" on public.messages for insert to authenticated with check(sender_id=(select auth.uid()) and not public.patiyiz_users_blocked(sender_id,receiver_id));
create policy "notifications_select" on public.notifications for select to authenticated using(owner_id=(select auth.uid()));
create policy "notifications_update" on public.notifications for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy "bookmarks_select" on public.kb_bookmarks for select to authenticated using(user_id=(select auth.uid()));
create policy "bookmarks_insert" on public.kb_bookmarks for insert to authenticated with check(user_id=(select auth.uid()));
create policy "bookmarks_delete" on public.kb_bookmarks for delete to authenticated using(user_id=(select auth.uid()));
create policy "blocks_select" on public.user_blocks for select to authenticated using(blocker_id=(select auth.uid()));
create policy "blocks_insert" on public.user_blocks for insert to authenticated with check(blocker_id=(select auth.uid()));
create policy "blocks_delete" on public.user_blocks for delete to authenticated using(blocker_id=(select auth.uid()));
create policy "reports_insert" on public.content_reports for insert to authenticated with check(reporter_id=(select auth.uid()));
create policy "reports_select" on public.content_reports for select to authenticated using(reporter_id=(select auth.uid()));

-- Bildirimleri sunucu üretir; kullanıcılar başka kullanıcıların adına bildirim yazamaz.
create or replace function public.notify_interaction() returns trigger
language plpgsql security definer set search_path = '' as $$
declare target_id uuid; actor_id uuid; kind_label text;
begin
 if TG_TABLE_NAME='post_likes' then
  select author_id into target_id from public.posts where id=new.post_id;
  actor_id:=new.user_id; kind_label:='Paylaşımın beğenildi.';
 elsif TG_TABLE_NAME='comments' then
  select author_id into target_id from public.posts where id=new.post_id;
  actor_id:=new.author_id; kind_label:='Paylaşımına yorum yapıldı.';
 elsif TG_TABLE_NAME='follows' then
  target_id:=new.followee_id; actor_id:=new.follower_id;
  kind_label:='Yeni bir takipçin var.';
 elsif TG_TABLE_NAME='replies' then
  select author_id into target_id from public.questions where id=new.question_id;
  actor_id:=new.author_id; kind_label:='Soruna yeni cevap geldi.';
 elsif TG_TABLE_NAME='messages' then
  target_id:=new.receiver_id; actor_id:=new.sender_id;
  kind_label:='Yeni mesajın var.';
 end if;
 if target_id is not null and actor_id is not null and target_id <> actor_id then
  insert into public.notifications(owner_id,actor_id,kind,text)
  values(target_id,actor_id,TG_TABLE_NAME,kind_label);
 end if;
 return new;
end $$;
create trigger notif_like after insert on public.post_likes for each row execute function public.notify_interaction();
create trigger notif_comment after insert on public.comments for each row execute function public.notify_interaction();
create trigger notif_follow after insert on public.follows for each row execute function public.notify_interaction();
create trigger notif_reply after insert on public.replies for each row execute function public.notify_interaction();
create trigger notif_message after insert on public.messages for each row execute function public.notify_interaction();

-- Her kullanıcı yalnızca kendi klasörüne JPG/PNG/WEBP yükleyebilir.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('patiyiz-media','patiyiz-media',true,6291456,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;
create policy "patiyiz_media_upload" on storage.objects for insert to authenticated
 with check(bucket_id='patiyiz-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "patiyiz_media_delete" on storage.objects for delete to authenticated
 using(bucket_id='patiyiz-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
-- Supabase PUBLIC bucket dosyaları doğrudan URL'den okunabilir; özel fotoğraf depolamayın.
