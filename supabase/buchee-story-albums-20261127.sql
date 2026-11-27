create schema if not exists buchee_story_internal;
revoke all on schema buchee_story_internal from public, anon, authenticated;

create table public.buchee_story_albums (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.profiles(id) on delete cascade,
 title text not null check (char_length(btrim(title)) between 1 and 40),
 cover_story_id uuid references public.patiyiz_stories(id) on delete set null,
 position integer not null,
 created_at timestamptz not null default now()
);
create index buchee_story_albums_owner_order on public.buchee_story_albums(owner_id,position,id);

create table public.buchee_story_album_items (
 album_id uuid not null references public.buchee_story_albums(id) on delete cascade,
 story_id uuid not null references public.patiyiz_stories(id) on delete cascade,
 position integer not null,
 primary key (album_id,story_id),
 unique (album_id,position)
);
create index buchee_story_album_items_story on public.buchee_story_album_items(story_id);

alter table public.buchee_story_albums enable row level security;
alter table public.buchee_story_album_items enable row level security;
revoke all on public.buchee_story_albums, public.buchee_story_album_items from public, anon, authenticated;

-- May be evaluated by RLS without granting access to the internal schema.
create function buchee_story_internal.can_view(p_author uuid,p_audience text)
returns boolean language sql stable security definer set search_path = '' as $$
 select (select auth.uid()) is not null and (
  p_author=(select auth.uid()) or (
   not public.patiyiz_users_blocked((select auth.uid()),p_author)
   and (exists(select 1 from public.profiles p where p.id=p_author and not p.is_private)
      or exists(select 1 from public.follows f where f.follower_id=(select auth.uid()) and f.followee_id=p_author))
   and (p_audience='everyone' or (p_audience='close_friends' and public.patiyiz_is_close_friend(p_author,(select auth.uid()))))
  )
 )
$$;
create function buchee_story_internal.in_album(p_story uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.buchee_story_album_items i where i.story_id=p_story)
$$;
revoke all on function buchee_story_internal.can_view(uuid,text),buchee_story_internal.in_album(uuid) from public,anon,authenticated;
grant execute on function buchee_story_internal.can_view(uuid,text),buchee_story_internal.in_album(uuid) to authenticated;

-- Published album membership extends expiry only. The original audience still applies.
create policy buchee_album_story_read on public.patiyiz_stories for select to authenticated
 using (
  buchee_story_internal.in_album(id)
  and buchee_story_internal.can_view(author_id,audience)
 );
create policy buchee_album_close_story_media on storage.objects for select to authenticated
 using (
  bucket_id='patiyiz-close-stories' and exists (
   select 1 from public.patiyiz_stories s
   where (s.private_image_path=name or s.private_video_path=name)
     and buchee_story_internal.in_album(s.id)
     and buchee_story_internal.can_view(s.author_id,s.audience)
  )
 );

create function public.buchee_story_album_list(p_owner uuid,p_album uuid default null)
returns table(id uuid,title text,cover jsonb,stories jsonb)
language sql stable security definer set search_path = '' as $$
 select a.id,a.title,items.cover,items.stories
 from public.buchee_story_albums a
 cross join lateral (
  select (jsonb_agg(to_jsonb(s) order by (s.id=a.cover_story_id) desc nulls last,i.position)->0) as cover,
   case when p_album is not null then coalesce(jsonb_agg(to_jsonb(s) order by i.position),'[]'::jsonb) else '[]'::jsonb end as stories
  from public.buchee_story_album_items i
  join public.patiyiz_stories s on s.id=i.story_id and s.author_id=a.owner_id
  where i.album_id=a.id and buchee_story_internal.can_view(s.author_id,s.audience)
 ) items
 where (select auth.uid()) is not null and a.owner_id=p_owner
   and (p_album is null or a.id=p_album)
   and (items.cover is not null or a.owner_id=(select auth.uid()))
 order by a.position,a.id
$$;

create function public.buchee_story_album_save(p_album uuid,p_title text,p_story_ids uuid[],p_cover uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_album uuid; v_next integer;
begin
 if v_owner is null then raise exception 'Giriş gerekli.'; end if;
 if coalesce(char_length(btrim(p_title)),0) not between 1 and 40 then raise exception 'Albüm adı 1–40 karakter olmalı.'; end if;
 if coalesce(cardinality(p_story_ids),0) not between 1 and 30 then raise exception '1–30 hikâye seç.'; end if;
 if p_cover is null or not coalesce(p_cover=any(p_story_ids),false) then raise exception 'Seçilen hikâyelerden bir kapak belirle.'; end if;
 perform 1 from public.profiles where id=v_owner for update;
 if (select count(*) from public.patiyiz_stories where id=any(p_story_ids) and author_id=v_owner)<>cardinality(p_story_ids) then
  raise exception 'Yalnızca sana ait mevcut hikâyeleri seçebilirsin.';
 end if;
 if p_album is null then
  select coalesce(max(position),0)+1 into v_next from public.buchee_story_albums where owner_id=v_owner;
  if (select count(*) from public.buchee_story_albums where owner_id=v_owner)>=12 then raise exception 'En fazla 12 albüm oluşturabilirsin.'; end if;
  insert into public.buchee_story_albums(owner_id,title,cover_story_id,position)
   values(v_owner,btrim(p_title),p_cover,v_next) returning id into v_album;
 else
  update public.buchee_story_albums set title=btrim(p_title),cover_story_id=p_cover
   where id=p_album and owner_id=v_owner returning id into v_album;
  if v_album is null then raise exception 'Albüm bulunamadı.'; end if;
  delete from public.buchee_story_album_items where album_id=v_album;
 end if;
 insert into public.buchee_story_album_items(album_id,story_id,position)
  select v_album,s.story_id,s.position::integer from unnest(p_story_ids) with ordinality as s(story_id,position);
 return v_album;
end
$$;

create function public.buchee_story_album_manage(p_album uuid,p_action text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_position integer; v_neighbor uuid; v_neighbor_position integer;
begin
 if v_owner is null then raise exception 'Giriş gerekli.'; end if;
 perform 1 from public.profiles where id=v_owner for update;
 select position into v_position from public.buchee_story_albums where id=p_album and owner_id=v_owner;
 if not found then raise exception 'Albüm bulunamadı.'; end if;
 if p_action='delete' then
  delete from public.buchee_story_albums where id=p_album and owner_id=v_owner;
  return;
 end if;
 if p_action is null or p_action not in ('left','right') then raise exception 'Geçersiz albüm işlemi.'; end if;
 select id,position into v_neighbor,v_neighbor_position from public.buchee_story_albums
  where owner_id=v_owner and (case when p_action='left' then position<v_position else position>v_position end)
  order by abs(position-v_position),id limit 1;
 if v_neighbor is not null then
  update public.buchee_story_albums set position=case when id=p_album then v_neighbor_position else v_position end
   where owner_id=v_owner and id in (p_album,v_neighbor);
 end if;
end
$$;

revoke all on function public.buchee_story_album_list(uuid,uuid),public.buchee_story_album_save(uuid,text,uuid[],uuid),public.buchee_story_album_manage(uuid,text) from public,anon,authenticated;
grant execute on function public.buchee_story_album_list(uuid,uuid),public.buchee_story_album_save(uuid,text,uuid[],uuid),public.buchee_story_album_manage(uuid,text) to authenticated;
