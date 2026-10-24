-- Additional Patiyiz PatiCoin missions · 2026-10-24.
-- All rewards are awarded ONLY by secure server-side checks and immutable task ledger keys.
-- Old balances, claims, rewards and order records are preserved. New periodic tasks have strict daily/weekly limits.
create or replace function public.patiyiz_claim_completed_tasks()
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare
 uid uuid:=(select auth.uid());
 task record;
 eligible boolean;
 created_id uuid;
 awarded jsonb:='[]'::jsonb;
 new_balance integer;
 local_day date:=(now() at time zone 'Europe/Istanbul')::date;
 local_week date:=date_trunc('week',now() at time zone 'Europe/Istanbul')::date;
 tomorrow timestamptz;
 week_end timestamptz;
 week_start timestamptz;
 day_start timestamptz;
 task_key text;
begin
 if uid is null then raise exception 'Oturum açmalısınız' using errcode='28000';end if;
 day_start:=local_day::timestamp at time zone 'Europe/Istanbul';
 tomorrow:=(local_day+1)::timestamp at time zone 'Europe/Istanbul';
 week_start:=local_week::timestamp at time zone 'Europe/Istanbul';
 week_end:=(local_week+7)::timestamp at time zone 'Europe/Istanbul';
 insert into public.patiyiz_reward_wallets(user_id) values(uid) on conflict(user_id) do nothing;
 perform 1 from public.patiyiz_reward_wallets where user_id=uid for update;
 for task in select * from (values
  ('profile_complete'::text,45,'Profili tamamla'),
  ('pet_created'::text,35,'Hayvan profili ekle'),
  ('first_post'::text,30,'İlk paylaşımını yap'),
  ('first_story'::text,25,'İlk hikâyeni paylaş'),
  ('first_follow'::text,15,'İlk hesabı takip et'),
  ('three_posts'::text,45,'Üç gönderi paylaş'),
  ('first_comment'::text,10,'İlk yorumunu yaz'),
  ('five_posts'::text,12,'Beş paylaşım yap'),
  ('ten_posts'::text,20,'On paylaşım yap'),
  ('five_follows'::text,10,'Beş kullanıcıyı takip et'),
  ('five_lessons'::text,12,'Beş ders tamamla'),
  ('twenty_lessons'::text,25,'Yirmi ders tamamla'),
  ('first_weight'::text,10,'İlk kilo kaydını ekle'),
  ('first_reminder'::text,10,'İlk bakım hatırlatıcını ekle'),
  ('first_saved'::text,5,'İlk gönderini kaydet'),
  ('daily_visit'::text,3,'Günlük aktif ol'),
  ('daily_post'::text,5,'Bugün paylaşım yap'),
  ('daily_story'::text,3,'Bugün hikâye paylaş'),
  ('daily_comment'::text,3,'Bugün yorum yap'),
  ('daily_lesson'::text,4,'Bugün ders tamamla'),
  ('weekly_active3'::text,10,'Haftada üç gün aktif ol'),
  ('weekly_posts3'::text,9,'Haftada üç paylaşım yap'),
  ('weekly_lessons3'::text,9,'Haftada üç ders tamamla'),
  ('weekly_comments5'::text,8,'Haftada beş yorum yap')
 ) as t(code,coins,title)
 loop
  task_key:=case when task.code like 'daily_%' then task.code||':'||to_char(local_day,'YYYYMMDD')
             when task.code like 'weekly_%' then task.code||':'||to_char(local_week,'YYYYMMDD')
             else task.code end;
  if exists(select 1 from public.patiyiz_reward_ledger l where l.user_id=uid and l.task_code=task_key) then continue;end if;
  eligible:=false;
  case task.code
   when 'profile_complete' then
    select exists(select 1 from public.profiles p where p.id=uid
       and length(btrim(coalesce(p.display_name,'')))>=2
       and length(btrim(coalesce(p.handle,'')))>=2
       and length(btrim(coalesce(p.bio,'')))>=10
       and length(btrim(coalesce(p.avatar_url,'')))>0) into eligible;
   when 'pet_created' then select exists(select 1 from public.pets p where p.owner_id=uid) into eligible;
   when 'first_post' then select exists(select 1 from public.posts p where p.author_id=uid) into eligible;
   when 'first_story' then select exists(select 1 from public.patiyiz_stories s where s.author_id=uid) into eligible;
   when 'first_follow' then select exists(select 1 from public.follows f where f.follower_id=uid) into eligible;
   when 'three_posts' then select (select count(*) from public.posts p where p.author_id=uid)>=3 into eligible;
   when 'first_comment' then select exists(select 1 from public.comments c where c.author_id=uid) into eligible;
   when 'five_posts' then select (select count(*) from public.posts p where p.author_id=uid)>=5 into eligible;
   when 'ten_posts' then select (select count(*) from public.posts p where p.author_id=uid)>=10 into eligible;
   when 'five_follows' then select (select count(*) from public.follows f where f.follower_id=uid)>=5 into eligible;
   when 'five_lessons' then select (select count(*) from public.patiyiz_education_progress x where x.user_id=uid)>=5 into eligible;
   when 'twenty_lessons' then select (select count(*) from public.patiyiz_education_progress x where x.user_id=uid)>=20 into eligible;
   when 'first_weight' then select exists(select 1 from public.patiyiz_pet_weights w where w.owner_id=uid) into eligible;
   when 'first_reminder' then select exists(select 1 from public.patiyiz_pet_reminders r where r.owner_id=uid) into eligible;
   when 'first_saved' then select exists(select 1 from public.post_saves s where s.user_id=uid) into eligible;
   when 'daily_visit' then select exists(select 1 from public.patiyiz_daily_active d where d.user_id=uid and d.active_day=local_day) into eligible;
   when 'daily_post' then select exists(select 1 from public.posts p where p.author_id=uid and p.created_at>=day_start and p.created_at<tomorrow) into eligible;
   when 'daily_story' then select exists(select 1 from public.patiyiz_stories s where s.author_id=uid and s.created_at>=day_start and s.created_at<tomorrow) into eligible;
   when 'daily_comment' then select exists(select 1 from public.comments c where c.author_id=uid and c.created_at>=day_start and c.created_at<tomorrow) into eligible;
   when 'daily_lesson' then select exists(select 1 from public.patiyiz_education_progress e where e.user_id=uid and e.completed_at>=day_start and e.completed_at<tomorrow) into eligible;
   when 'weekly_active3' then select (select count(*) from public.patiyiz_daily_active d where d.user_id=uid and d.active_day>=local_week and d.active_day<local_week+7)>=3 into eligible;
   when 'weekly_posts3' then select (select count(*) from public.posts p where p.author_id=uid and p.created_at>=week_start and p.created_at<week_end)>=3 into eligible;
   when 'weekly_lessons3' then select (select count(*) from public.patiyiz_education_progress x where x.user_id=uid and x.completed_at>=week_start and x.completed_at<week_end)>=3 into eligible;
   when 'weekly_comments5' then select (select count(*) from public.comments c where c.author_id=uid and c.created_at>=week_start and c.created_at<week_end)>=5 into eligible;
  end case;
  if not coalesce(eligible,false) then continue;end if;
  created_id:=null;
  insert into public.patiyiz_reward_ledger(user_id,task_code,delta)
  values(uid,task_key,task.coins) on conflict(user_id,task_code) do nothing returning id into created_id;
  if created_id is not null then
   update public.patiyiz_reward_wallets
    set balance=balance+task.coins,lifetime_earned=lifetime_earned+task.coins,updated_at=now()
    where user_id=uid;
   awarded:=awarded||jsonb_build_array(jsonb_build_object('code',task_key,'title',task.title,'coins',task.coins));
  end if;
 end loop;
 select balance into new_balance from public.patiyiz_reward_wallets where user_id=uid;
 return jsonb_build_object('awarded',awarded,'balance',new_balance);
end $function$;
revoke all on function public.patiyiz_claim_completed_tasks() from public,anon;
grant execute on function public.patiyiz_claim_completed_tasks() to authenticated;

-- Saved posts already exist. Enforce explicit owner-only RLS and index for reliable persistence.
alter table public.post_saves enable row level security;
grant select,insert,delete on public.post_saves to authenticated;
create index if not exists patiyiz_post_saves_user_date_idx on public.post_saves(user_id,created_at desc);
