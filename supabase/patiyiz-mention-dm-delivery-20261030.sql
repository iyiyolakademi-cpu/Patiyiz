-- When an authorized mention notification is generated, place the referenced
-- post or comment into the recipient's existing private Messages inbox.
-- Client applications do not gain any new INSERT permissions.
create schema if not exists patiyiz_private;

create or replace function patiyiz_private.send_mention_dm_20261030()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
 v_post_author uuid;
 v_private boolean;
 v_policy text;
 v_body text;
begin
 if new.kind <> 'mentions' or new.post_id is null
    or new.owner_id is null or new.actor_id is null
    or new.actor_id = new.owner_id then return new;end if;

 -- Follow the same block and recipient-side DM controls as the normal client.
 if exists(select 1 from public.user_blocks b
    where (b.blocker_id=new.actor_id and b.blocked_id=new.owner_id)
       or (b.blocker_id=new.owner_id and b.blocked_id=new.actor_id)) then
  return new;
 end if;
 if exists(select 1 from public.patiyiz_restricted_accounts r
    where r.owner_id=new.owner_id and r.restricted_id=new.actor_id) then
  return new;
 end if;
 select p.dm_policy into v_policy from public.profiles p where p.id=new.owner_id;
 if not found or not (
    v_policy='everyone'
    or (v_policy='following' and exists(
      select 1 from public.follows f
       where f.follower_id=new.owner_id and f.followee_id=new.actor_id
    ))
 ) then return new;end if;

 -- Do not deliver a private post to someone who cannot see its actual content.
 select p.author_id,coalesce(author_profile.is_private,false)
 into v_post_author,v_private
 from public.posts p
 join public.profiles author_profile on author_profile.id=p.author_id
 where p.id=new.post_id;
 if v_post_author is null then return new;end if;
 if exists(select 1 from public.user_blocks b
    where (b.blocker_id=v_post_author and b.blocked_id=new.owner_id)
       or (b.blocker_id=new.owner_id and b.blocked_id=v_post_author)) then
  return new;
 end if;
 if v_private and v_post_author<>new.owner_id
  and not exists(select 1 from public.follows f
       where f.follower_id=new.owner_id and f.followee_id=v_post_author) then
  return new;
 end if;

 -- A single mention sends a post card; a comment mention additionally links
 -- to the exact comment, not to a vague user profile.
 v_body:='🔖 Seni etiketledi: https://patiyiz.com/#post-'||new.post_id::text
   ||case when new.comment_id is not null
     then '?comment='||new.comment_id::text else '' end;

 if exists(select 1 from public.messages m
    where m.sender_id=new.actor_id and m.receiver_id=new.owner_id
      and m.body=v_body and m.created_at>now()-interval '1 day') then
  return new;
 end if;
 if (select count(*) from public.messages m
      where m.sender_id=new.actor_id
        and m.body like '🔖 Seni etiketledi:%'
        and m.created_at>now()-interval '1 minute')>=10 then
  return new;
 end if;

 insert into public.messages(sender_id,receiver_id,body)
 values(new.actor_id,new.owner_id,v_body);
 return new;
exception when others then
 -- A delivery failure never prevents saving a legitimate comment or post.
 raise warning 'Mention direct-message delivery failed (%).',SQLSTATE;
 return new;
end;
$function$;

revoke all on function patiyiz_private.send_mention_dm_20261030()
 from public,anon,authenticated;
drop trigger if exists patiyiz_mention_dm_delivery_20261030
 on public.notifications;
create trigger patiyiz_mention_dm_delivery_20261030
 after insert on public.notifications
 for each row
 when (new.kind='mentions')
 execute function patiyiz_private.send_mention_dm_20261030();
