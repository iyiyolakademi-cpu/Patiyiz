-- Patiyiz Premium Akademi schema. Never commit paid lesson bodies to a public repository.
-- 81 proprietary lesson bodies are seeded directly into Supabase; the client receives them only
-- through RLS after the user has an active verified premium entitlement.
create table if not exists public.patiyiz_premium_courses (
 id text primary key,title text not null,subtitle text not null,
 days integer not null check(days between 1 and 120),
 icon text not null,tag text not null,published boolean not null default true
);
alter table public.patiyiz_premium_courses enable row level security;
revoke all on public.patiyiz_premium_courses from anon,authenticated;
grant select on public.patiyiz_premium_courses to authenticated;
drop policy if exists "premium_course_teasers" on public.patiyiz_premium_courses;
create policy "premium_course_teasers" on public.patiyiz_premium_courses
 for select to authenticated using (published);

create table if not exists public.patiyiz_premium_lessons (
 course_id text not null references public.patiyiz_premium_courses(id) on delete cascade,
 day_no integer not null check (day_no between 1 and 120),
 module_name text not null,title text not null,activity text not null,reflection text not null,
 primary key(course_id,day_no)
);
alter table public.patiyiz_premium_lessons enable row level security;
revoke all on public.patiyiz_premium_lessons from anon,authenticated;
grant select on public.patiyiz_premium_lessons to authenticated;
drop policy if exists "premium_lessons_members_only" on public.patiyiz_premium_lessons;
create policy "premium_lessons_members_only" on public.patiyiz_premium_lessons
 for select to authenticated using (
 exists(select 1 from public.patiyiz_premium_entitlements e
 where e.user_id=(select auth.uid()) and (e.expires_at is null or e.expires_at>now()))
 and exists(select 1 from public.patiyiz_premium_courses c where c.id=course_id and c.published)
);

create table if not exists public.patiyiz_premium_progress (
 user_id uuid not null references auth.users(id) on delete cascade,
 course_id text not null, day_no integer not null,
 completed_at timestamptz not null default now(),
 primary key(user_id,course_id,day_no),
 foreign key(course_id,day_no)
 references public.patiyiz_premium_lessons(course_id,day_no) on delete cascade
);
create index if not exists patiyiz_premium_progress_course_day_idx on public.patiyiz_premium_progress(course_id,day_no);
alter table public.patiyiz_premium_progress enable row level security;
revoke all on public.patiyiz_premium_progress from anon,authenticated;
grant select,insert on public.patiyiz_premium_progress to authenticated;
drop policy if exists "premium_progress_self_read" on public.patiyiz_premium_progress;
drop policy if exists "premium_progress_member_insert" on public.patiyiz_premium_progress;
create policy "premium_progress_self_read" on public.patiyiz_premium_progress
 for select to authenticated using(user_id=(select auth.uid()));
create policy "premium_progress_member_insert" on public.patiyiz_premium_progress
 for insert to authenticated with check (
 user_id=(select auth.uid()) and
 exists(select 1 from public.patiyiz_premium_entitlements e
 where e.user_id=(select auth.uid()) and (e.expires_at is null or e.expires_at>now()))
);

create table if not exists public.patiyiz_premium_waitlist (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.patiyiz_premium_waitlist enable row level security;
revoke all on public.patiyiz_premium_waitlist from anon,authenticated;
grant select,insert,delete on public.patiyiz_premium_waitlist to authenticated;
drop policy if exists "premium_waitlist_self_read" on public.patiyiz_premium_waitlist;
drop policy if exists "premium_waitlist_self_insert" on public.patiyiz_premium_waitlist;
drop policy if exists "premium_waitlist_self_delete" on public.patiyiz_premium_waitlist;
create policy "premium_waitlist_self_read" on public.patiyiz_premium_waitlist
 for select to authenticated using(user_id=(select auth.uid()));
create policy "premium_waitlist_self_insert" on public.patiyiz_premium_waitlist
 for insert to authenticated with check(user_id=(select auth.uid()));
create policy "premium_waitlist_self_delete" on public.patiyiz_premium_waitlist
 for delete to authenticated using(user_id=(select auth.uid()));
revoke insert,update,delete on public.patiyiz_premium_entitlements from anon,authenticated;

-- IMPORTANT: no payment provider and no automatic entitlements.
-- A verified server-side purchase receipt or a controlled administrative grant is required.
