-- Patiyiz: complete, user-scoped DM inbox with pagination.
-- SECURITY INVOKER intentionally enforces messages/message_hidden RLS and blocked-user policies.
-- No service role or privileged SECURITY DEFINER access.
create or replace function public.patiyiz_dm_inbox(
 p_limit integer default 80,
 p_offset integer default 0
)
returns table(
 peer_id uuid,
 message_id uuid,
 last_body text,
 last_created_at timestamptz,
 last_sender_id uuid,
 unread_count bigint,
 has_incoming boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
 with viewer as (
  select (select auth.uid()) as uid
 ), scoped as (
  select
   case when m.sender_id = v.uid then m.receiver_id else m.sender_id end as peer,
   m.id, m.body, m.created_at, m.sender_id, m.receiver_id, m.read_at,
   v.uid
  from public.messages m cross join viewer v
  where v.uid is not null
    and (m.sender_id = v.uid or m.receiver_id = v.uid)
    and not exists (
     select 1 from public.message_hidden h
     where h.user_id = v.uid and h.message_id = m.id
    )
 ), ranked as (
  select s.*,
   row_number() over(partition by peer order by created_at desc,id desc) as row_number,
   count(*) filter(where receiver_id = uid and read_at is null)
     over(partition by peer) as unread,
   bool_or(sender_id = peer and receiver_id = uid)
     over(partition by peer) as incoming
  from scoped s
 )
 select peer as peer_id,id as message_id,body as last_body,
        created_at as last_created_at,sender_id as last_sender_id,
        unread as unread_count,incoming as has_incoming
 from ranked
 where row_number = 1
 order by last_created_at desc,message_id desc
 limit greatest(1,least(coalesce(p_limit,80),100))
 offset greatest(0,least(coalesce(p_offset,0),100000));
$$;
revoke all on function public.patiyiz_dm_inbox(integer,integer) from public,anon;
grant execute on function public.patiyiz_dm_inbox(integer,integer) to authenticated;
comment on function public.patiyiz_dm_inbox(integer,integer)
 is 'RLS-scoped per-conversation summary; excludes message_hidden and blocked conversations via messages RLS.';
