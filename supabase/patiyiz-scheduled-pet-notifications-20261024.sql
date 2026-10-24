-- Patiyiz: background pet-care notifications (2026-10-24).
-- Dispatches at most one notification per active reminder and occurrence.
-- Existing notifications INSERT webhook delivers Web Push only to opted-in subscribers.
-- No service role, access token or webhook secret is required in this SQL.
create extension if not exists pg_cron with schema pg_catalog;
create schema if not exists patiyiz_private;
revoke all on schema patiyiz_private from public, anon, authenticated;

alter table public.patiyiz_pet_reminders
 add column if not exists notified_at timestamptz;

create index if not exists patiyiz_pet_reminders_dispatch_idx
 on public.patiyiz_pet_reminders(due_at)
 where completed_at is null and notified_at is null;

create or replace function patiyiz_private.reminder_reset_notification()
returns trigger language plpgsql set search_path = ''
as $function$
begin
 if new.due_at is distinct from old.due_at
    or new.remind_minutes_before is distinct from old.remind_minutes_before
 then
  new.notified_at := null;
 end if;
 return new;
end
$function$;

drop trigger if exists patiyiz_reminder_reset_notification on public.patiyiz_pet_reminders;
create trigger patiyiz_reminder_reset_notification
 before update on public.patiyiz_pet_reminders
 for each row execute function patiyiz_private.reminder_reset_notification();

create or replace function patiyiz_private.dispatch_due_pet_reminders()
returns integer language plpgsql set search_path = ''
as $function$
declare
 reminder record;
 delivered integer := 0;
begin
 for reminder in
  select r.id,r.owner_id,r.title,r.kind,coalesce(p.name,'Patili dost') as pet_name
  from public.patiyiz_pet_reminders r
  join public.pets p on p.id=r.pet_id and p.owner_id=r.owner_id
  where r.completed_at is null and r.notified_at is null
    and r.due_at >= now()-interval '24 hours'
    and r.due_at-make_interval(mins=>greatest(0,r.remind_minutes_before)) <= now()
  order by r.due_at
  limit 100
  for update of r skip locked
 loop
  insert into public.notifications(owner_id,actor_id,kind,text)
  values(
    reminder.owner_id,
    null,
    'pet_reminder',
    left('🐾 ' || reminder.pet_name || ' · ' ||
      case reminder.kind
        when 'vaccine' then 'Aşı hatırlatması'
        when 'vet' then 'Veteriner randevusu'
        when 'food' then 'Mama hatırlatması'
        when 'medicine' then 'İlaç hatırlatması'
        else 'Bakım hatırlatması'
      end || ': ' || reminder.title,220)
  );
  update public.patiyiz_pet_reminders
    set notified_at=now()
    where id=reminder.id;
  delivered:=delivered+1;
 end loop;
 return delivered;
end
$function$;
revoke all on function patiyiz_private.dispatch_due_pet_reminders() from public, anon, authenticated;
revoke all on function patiyiz_private.reminder_reset_notification() from public, anon, authenticated;

-- Named schedule is idempotent; replacing it never creates a duplicate job.
select cron.schedule(
 'patiyiz-pet-reminders',
 '* * * * *',
 $cron$select patiyiz_private.dispatch_due_pet_reminders();$cron$
);
