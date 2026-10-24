-- Atomic single-completion and next-instance creation for repeating pet reminders.
create or replace function public.patiyiz_complete_pet_reminder(p_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid(); reminder public.patiyiz_pet_reminders%rowtype; next_id uuid;
begin
 if uid is null then raise exception 'Giriş yapmalısınız' using errcode='28000'; end if;
 select * into reminder from public.patiyiz_pet_reminders
 where id=p_id and owner_id=uid for update;
 if not found then raise exception 'Hatırlatma bulunamadı'; end if;
 if reminder.completed_at is not null then
  raise exception 'Bu hatırlatma zaten tamamlandı'; end if;
 update public.patiyiz_pet_reminders set completed_at=now()
 where id=reminder.id;
 if reminder.repeat_days is not null then
  insert into public.patiyiz_pet_reminders(
   owner_id,pet_id,kind,title,note,due_at,remind_minutes_before,repeat_days
  ) values(
   uid,reminder.pet_id,reminder.kind,reminder.title,reminder.note,
   reminder.due_at+(reminder.repeat_days * interval '1 day'),
   reminder.remind_minutes_before,reminder.repeat_days
  ) returning id into next_id;
 end if;
 return jsonb_build_object('completed',p_id,'next_reminder_id',next_id);
end $$;
revoke execute on function public.patiyiz_complete_pet_reminder(uuid) from public,anon;
grant execute on function public.patiyiz_complete_pet_reminder(uuid) to authenticated;
