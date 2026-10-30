-- Deliver @mentions as owner-only notifications; keep comments/posts writeable without extra client privileges.
-- The trigger is internal and does not accept arbitrary sender/recipient parameters.
alter table public.notifications
 add column if not exists comment_id uuid references public.comments(id) on delete set null;
create index if not exists patiyiz_mentions_post_comment_20261030_idx
 on public.notifications(owner_id, post_id, comment_id)
 where kind='mentions';

create schema if not exists patiyiz_private;
create or replace function patiyiz_private.notify_content_mentions_20261030()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
 v_handle text;
 v_target uuid;
 v_post uuid;
 v_comment uuid;
 v_actor uuid;
 v_body text;
begin
 if tg_table_name='comments' then
  v_post:=new.post_id;v_comment:=new.id;
 else
  v_post:=new.id;v_comment:=null;
 end if;
 v_actor:=new.author_id;
 v_body:=coalesce(new.body,'');
 if v_actor is null or v_post is null or position('@' in v_body)=0 then return new;end if;
 -- Maximum five distinct recipients per new comment/post, to avoid broadcast spam.
 for v_handle in
  select distinct lower(parts[2])
  from regexp_matches(v_body,'(^|[^[:alnum:]_.])@([[:alnum:]_.]{2,40})','g') as hits(parts)
  limit 5
 loop
  v_target:=null;
  select p.id into v_target from public.profiles p
   where lower(p.handle)=v_handle and p.id<>v_actor limit 1;
  if v_target is null then continue;end if;
  if exists(select 1 from public.user_blocks b
   where (b.blocker_id=v_actor and b.blocked_id=v_target)
      or (b.blocker_id=v_target and b.blocked_id=v_actor)) then continue;end if;
  if (select count(*) from public.notifications n
      where n.actor_id=v_actor and n.kind='mentions'
        and n.created_at>now()-interval '1 minute') >= 15 then exit;end if;
  if exists(select 1 from public.notifications n
     where n.owner_id=v_target and n.actor_id=v_actor
       and n.kind='mentions' and n.post_id=v_post
       and n.created_at>now()-interval '30 seconds') then continue;end if;
  insert into public.notifications(owner_id,actor_id,kind,text,post_id,comment_id)
  values(v_target,v_actor,'mentions',
   case when v_comment is null then 'Bir gönderide senden bahsetti.'
        else 'Bir yorumda senden bahsetti.' end,
   v_post,v_comment);
 end loop;
 return new;
exception when others then
 -- A notification outage must not reject a successfully submitted comment or post.
 raise warning 'Content mention delivery failed (SQLSTATE %)', SQLSTATE;
 return new;
end
$fn$;
revoke all on function patiyiz_private.notify_content_mentions_20261030() from public,anon,authenticated;
drop trigger if exists patiyiz_comment_mentions_20261030 on public.comments;
create trigger patiyiz_comment_mentions_20261030 after insert on public.comments
 for each row execute function patiyiz_private.notify_content_mentions_20261030();
drop trigger if exists patiyiz_post_mentions_20261030 on public.posts;
create trigger patiyiz_post_mentions_20261030 after insert on public.posts
 for each row execute function patiyiz_private.notify_content_mentions_20261030();
