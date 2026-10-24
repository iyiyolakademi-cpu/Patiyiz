-- Allow PostgreSQL's ON DELETE SET NULL cleanup of reply_to during a
-- permanent, two-party DM deletion, without permitting arbitrary message edits.
-- The authenticated role has NO UPDATE privilege on reply_to.
create or replace function public.patiyiz_validate_message_change()
 returns trigger language plpgsql set search_path=''
as $function$
declare source public.messages%rowtype;
begin
 if tg_op='INSERT' then
  if new.reply_to is not null then
   select * into source from public.messages where id=new.reply_to;
   if source.id is null or not (
     (source.sender_id=new.sender_id and source.receiver_id=new.receiver_id)
     or (source.sender_id=new.receiver_id and source.receiver_id=new.sender_id))
   then raise exception 'Invalid reply target' using errcode='42501';end if;
  end if;
  return new;
 end if;
 if new.id is distinct from old.id
    or new.sender_id is distinct from old.sender_id
    or new.receiver_id is distinct from old.receiver_id
    or new.created_at is distinct from old.created_at
    or new.attachment_path is distinct from old.attachment_path
    or new.attachment_type is distinct from old.attachment_type
    or (new.reply_to is distinct from old.reply_to
         and (new.reply_to is not null
             or exists(select 1 from public.messages parent where parent.id=old.reply_to)))
 then raise exception 'Immutable message fields cannot be changed' using errcode='42501';end if;
 if new.body is distinct from old.body or new.edited_at is distinct from old.edited_at then
  if old.sender_id is distinct from (select auth.uid())
   or old.created_at < now()-interval '15 minutes'
   or old.attachment_path is not null or old.attachment_type is not null
   or new.edited_at is null or new.edited_at<old.created_at
   or new.body is null or char_length(trim(new.body)) not between 1 and 1000
   or new.read_at is distinct from old.read_at
  then raise exception 'Message editing not permitted' using errcode='42501';end if;
 end if;
 if new.read_at is distinct from old.read_at
    and (old.receiver_id is distinct from (select auth.uid())
         or new.body is distinct from old.body or new.edited_at is distinct from old.edited_at)
 then raise exception 'Read marker update not permitted' using errcode='42501';end if;
 return new;
end
$function$;
