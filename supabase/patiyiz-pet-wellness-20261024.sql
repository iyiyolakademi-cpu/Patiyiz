-- Private pet wellness schedule and weight history.
create table if not exists public.patiyiz_pet_reminders(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 pet_id uuid not null references public.pets(id) on delete cascade,
 kind text not null check(kind in ('vaccine','vet','food','medicine')),
 title text not null check(length(btrim(title)) between 2 and 110),
 note text not null default '' check(length(note)<=500),
 due_at timestamptz not null,
 remind_minutes_before integer not null default 60 check(remind_minutes_before between 0 and 10080),
 repeat_days integer check(repeat_days between 1 and 365),
 completed_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists patiyiz_pet_reminders_owner_due on public.patiyiz_pet_reminders(owner_id,due_at);
create index if not exists patiyiz_pet_reminders_pet_due on public.patiyiz_pet_reminders(pet_id,due_at);
alter table public.patiyiz_pet_reminders enable row level security;
grant select,insert,update,delete on public.patiyiz_pet_reminders to authenticated;
create policy "pet reminders private read" on public.patiyiz_pet_reminders for select to authenticated
 using(owner_id=(select auth.uid()));
create policy "pet reminders private insert" on public.patiyiz_pet_reminders for insert to authenticated
 with check(owner_id=(select auth.uid()) and exists(select 1 from public.pets p where p.id=pet_id and p.owner_id=(select auth.uid())));
create policy "pet reminders private update" on public.patiyiz_pet_reminders for update to authenticated
 using(owner_id=(select auth.uid()))
 with check(owner_id=(select auth.uid()) and exists(select 1 from public.pets p where p.id=pet_id and p.owner_id=(select auth.uid())));
create policy "pet reminders private delete" on public.patiyiz_pet_reminders for delete to authenticated
 using(owner_id=(select auth.uid()));

create table if not exists public.patiyiz_pet_weights(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 pet_id uuid not null references public.pets(id) on delete cascade,
 weight_kg numeric(6,2) not null check(weight_kg>0 and weight_kg<=300),
 measured_on date not null default current_date,
 note text not null default '' check(length(note)<=250),
 created_at timestamptz not null default now()
);
create index if not exists patiyiz_pet_weights_owner_day on public.patiyiz_pet_weights(owner_id,measured_on desc);
create index if not exists patiyiz_pet_weights_pet_day on public.patiyiz_pet_weights(pet_id,measured_on desc);
alter table public.patiyiz_pet_weights enable row level security;
grant select,insert,update,delete on public.patiyiz_pet_weights to authenticated;
create policy "pet weight private read" on public.patiyiz_pet_weights for select to authenticated using(owner_id=(select auth.uid()));
create policy "pet weight private insert" on public.patiyiz_pet_weights for insert to authenticated
 with check(owner_id=(select auth.uid()) and exists(select 1 from public.pets p where p.id=pet_id and p.owner_id=(select auth.uid())));
create policy "pet weight private update" on public.patiyiz_pet_weights for update to authenticated
 using(owner_id=(select auth.uid()))
 with check(owner_id=(select auth.uid()) and exists(select 1 from public.pets p where p.id=pet_id and p.owner_id=(select auth.uid())));
create policy "pet weight private delete" on public.patiyiz_pet_weights for delete to authenticated using(owner_id=(select auth.uid()));
comment on table public.patiyiz_pet_reminders is 'Private schedule; in-app reminders show while user opens the app. Not an SMS/push scheduling service.';
