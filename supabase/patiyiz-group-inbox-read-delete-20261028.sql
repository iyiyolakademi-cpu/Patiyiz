-- Patiyiz group-chat reliability: self-service read markers, unread counts,
-- recent-message ordering and own-message deletion. Existing direct DMs unchanged.
alter table public.patiyiz_group_members
 add column if not exists last_read_at timestamptz not null default now();

-- SECURITY INVOKER view: use caller RLS rather than privileged view owner.
create or replace view public.patiyiz_group_inbox with (security_invoker=true) as
select
 m.user_id,
 g.id as group_id,
 g.title,
 g.creator_id,
 g.created_at,
 coalesce(max(msg.created_at),g.created_at) as activity_at,
 (array_agg(msg.body order by msg.created_at desc,msg.id desc)
   filter (where msg.id is not null))[1] as last_body,
 (array_agg(msg.sender_id order by msg.created_at desc,msg.id desc)
   filter (where msg.id is not null))[1] as last_sender_id,
 count(msg.id) filter (
   where msg.sender_id<>m.user_id and msg.created_at>m.last_read_at
 )::integer as unread_count
from public.patiyiz_group_members m
join public.patiyiz_group_chats g on g.id=m.group_id
left join public.patiyiz_group_messages msg on msg.group_id=g.id
where m.user_id=(select auth.uid())
group by m.user_id,m.last_read_at,g.id,g.title,g.creator_id,g.created_at;

revoke all on public.patiyiz_group_inbox from public,anon;
grant select on public.patiyiz_group_inbox to authenticated;

-- Never accept a client-provided future timestamp: only the authenticated
-- group member can mark their own membership read, at server time.
create or replace function public.patiyiz_group_mark_read(p_group uuid)
returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 update public.patiyiz_group_members
 set last_read_at=now()
 where group_id=p_group and user_id=auth.uid();
 if not found then raise exception 'You are not a group member'; end if;
end;
$$;
revoke all on function public.patiyiz_group_mark_read(uuid) from public,anon;
grant execute on function public.patiyiz_group_mark_read(uuid) to authenticated;

grant delete on public.patiyiz_group_messages to authenticated;
drop policy if exists group_message_delete_self on public.patiyiz_group_messages;
create policy group_message_delete_self on public.patiyiz_group_messages
 for delete to authenticated using (
   sender_id=(select auth.uid())
   and public.patiyiz_group_is_member(group_id,(select auth.uid()))
 );
