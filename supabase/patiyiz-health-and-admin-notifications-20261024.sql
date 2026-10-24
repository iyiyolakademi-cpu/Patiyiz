-- Patiyiz digital pet health files and guarded administrative announcements.
-- Private bucket. No service keys in frontend. Existing tables/data remain untouched.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('patiyiz-health-private','patiyiz-health-private',false,10485760,
 array['application/pdf','image/jpeg','image/png','image/webp']::text[])
on conflict(id) do update set public=false,file_size_limit=10485760,
allowed_mime_types=excluded.allowed_mime_types;

create table if not exists public.patiyiz_health_documents(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 pet_id uuid not null references public.pets(id) on delete cascade,
 doc_type text not null check(doc_type in ('vaccine','vet','test','medicine','other')),
 title text not null check(length(btrim(title)) between 2 and 100),
 notes text not null default '' check(length(notes)<=1000),
 document_date date not null default current_date,
 object_path text unique,
 mime_type text check(mime_type in ('application/pdf','image/jpeg','image/png','image/webp')),
 byte_size integer check(byte_size>0 and byte_size<=10485760),
 created_at timestamptz not null default now(),
 check((object_path is null and mime_type is null and byte_size is null)
    or(object_path is not null and mime_type is not null and byte_size is not null)),
 check(object_path is null or object_path like owner_id::text||'/'||pet_id::text||'/%')
);
create index if not exists patiyiz_health_documents_pet_date_idx
 on public.patiyiz_health_documents(pet_id,document_date desc);
create index if not exists patiyiz_health_documents_owner_idx
 on public.patiyiz_health_documents(owner_id,created_at desc);
alter table public.patiyiz_health_documents enable row level security;
revoke all on public.patiyiz_health_documents from anon,authenticated;
grant select,insert,delete on public.patiyiz_health_documents to authenticated;
drop policy if exists "health_documents_select_owner" on public.patiyiz_health_documents;
drop policy if exists "health_documents_insert_owner_pet" on public.patiyiz_health_documents;
drop policy if exists "health_documents_delete_owner" on public.patiyiz_health_documents;
create policy "health_documents_select_owner" on public.patiyiz_health_documents for select to authenticated
 using(owner_id=(select auth.uid()));
create policy "health_documents_insert_owner_pet" on public.patiyiz_health_documents for insert to authenticated
 with check(owner_id=(select auth.uid()) and exists(select 1 from public.pets p where p.id=pet_id and p.owner_id=(select auth.uid())));
create policy "health_documents_delete_owner" on public.patiyiz_health_documents for delete to authenticated
 using(owner_id=(select auth.uid()));

drop policy if exists "health_bucket_upload_owner" on storage.objects;
drop policy if exists "health_bucket_read_owner" on storage.objects;
drop policy if exists "health_bucket_delete_owner" on storage.objects;
create policy "health_bucket_upload_owner" on storage.objects for insert to authenticated
 with check(bucket_id='patiyiz-health-private'
 and (storage.foldername(name))[1]=(select auth.uid())::text
 and exists(select 1 from public.pets p where p.id::text=(storage.foldername(name))[2] and p.owner_id=(select auth.uid())));
create policy "health_bucket_read_owner" on storage.objects for select to authenticated
 using(bucket_id='patiyiz-health-private' and (storage.foldername(name))[1]=(select auth.uid())::text
 and exists(select 1 from public.pets p where p.id::text=(storage.foldername(name))[2] and p.owner_id=(select auth.uid())));
create policy "health_bucket_delete_owner" on storage.objects for delete to authenticated
 using(bucket_id='patiyiz-health-private' and (storage.foldername(name))[1]=(select auth.uid())::text
 and exists(select 1 from public.pets p where p.id::text=(storage.foldername(name))[2] and p.owner_id=(select auth.uid())));

-- Server-only admin announcement audit, repeat-send prevention and automatic push via existing notifications trigger.
create table if not exists public.patiyiz_admin_announcements(
 id uuid primary key,
 admin_id uuid not null references auth.users(id),
 title text not null check(length(btrim(title)) between 5 and 75),
 body text not null check(length(btrim(body)) between 10 and 150),
 audience text not null default 'all' check(audience='all'),
 recipients integer not null default 0,
 created_at timestamptz not null default now()
);
create index if not exists patiyiz_admin_announcements_day_idx on public.patiyiz_admin_announcements(created_at desc);
alter table public.patiyiz_admin_announcements enable row level security;
revoke all on public.patiyiz_admin_announcements from anon,authenticated;

create or replace function public.patiyiz_admin_announce(p_campaign uuid,p_title text,p_body text)
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare
 uid uuid:=(select auth.uid());
 title_value text:=btrim(coalesce(p_title,''));
 body_value text:=btrim(coalesce(p_body,''));
 r_count int:=0;
 v_previous public.patiyiz_admin_announcements%rowtype;
begin
 if uid is null or not exists(select 1 from public.patiyiz_admins a where a.user_id=uid) then
  raise exception 'Admin access required' using errcode='42501';
 end if;
 if p_campaign is null or length(title_value) not between 5 and 75 or length(body_value) not between 10 and 150 then
  raise exception 'Bildirim başlığı 5–75, mesajı 10–150 karakter olmalı';
 end if;
 -- Serialize broadcasts, even when two admin browser tabs issue requests simultaneously.
 perform pg_catalog.pg_advisory_xact_lock(704417,20261024);
 select * into v_previous from public.patiyiz_admin_announcements where id=p_campaign;
 if found then
  if v_previous.admin_id<>uid or v_previous.title<>title_value or v_previous.body<>body_value then
   raise exception 'Bu gönderim kimliği farklı içerik için kullanılamaz';
  end if;
  return jsonb_build_object('recipients',v_previous.recipients,'duplicate',true);
 end if;
 if exists(select 1 from public.patiyiz_admin_announcements a where a.created_at>now()-interval '10 minutes') then
  raise exception 'Yeni toplu bildirim için en az 10 dakika beklemelisin';
 end if;
 if (select count(*) from public.patiyiz_admin_announcements a where a.created_at>now()-interval '1 day')>=5 then
  raise exception '24 saatlik en fazla 5 toplu bildirim sınırına ulaşıldı';
 end if;
 select count(*) into r_count from public.profiles;
 if r_count=0 then raise exception 'Bildirim gönderilecek kullanıcı bulunamadı';end if;
 if r_count>1000 then raise exception '1000 kişiden büyük gönderimler için kontrollü dağıtım altyapısı gerekli';end if;
 insert into public.patiyiz_admin_announcements(id,admin_id,title,body,audience,recipients)
 values(p_campaign,uid,title_value,body_value,'all',r_count);
 insert into public.notifications(owner_id,actor_id,kind,text)
 select p.id,null,'announcement',left('📢 '||title_value||' — '||body_value,250)
 from public.profiles p;
 return jsonb_build_object('recipients',r_count,'duplicate',false);
end
$function$;
revoke all on function public.patiyiz_admin_announce(uuid,text,text) from public,anon,authenticated;
grant execute on function public.patiyiz_admin_announce(uuid,text,text) to authenticated;

create or replace function public.patiyiz_admin_announcement_history()
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare uid uuid:=(select auth.uid());
begin
 if uid is null or not exists(select 1 from public.patiyiz_admins a where a.user_id=uid) then
  raise exception 'Admin access required' using errcode='42501';
 end if;
 return coalesce((select jsonb_agg(to_jsonb(h) order by h.created_at desc)
 from (select id,title,body,recipients,created_at from public.patiyiz_admin_announcements
 order by created_at desc limit 12) h),'[]'::jsonb);
end
$function$;
revoke all on function public.patiyiz_admin_announcement_history() from public,anon,authenticated;
grant execute on function public.patiyiz_admin_announcement_history() to authenticated;

comment on table public.patiyiz_health_documents is
 'Private animal health notes and optionally attached private PDF/images. Only the pet owner has row access.';
comment on table public.patiyiz_admin_announcements is
 'Admin-only idempotent notification broadcast audit. Existing notifications trigger attempts Web Push for subscribed devices.';
