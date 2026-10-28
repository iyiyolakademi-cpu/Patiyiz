-- Existing requests and admin decisions are retained. Only grant own-account request access.
-- Never grant status/reviewed columns or UPDATE to the client.
alter table public.verification_requests enable row level security;
revoke all on table public.verification_requests from public, anon, authenticated;
grant select on table public.verification_requests to authenticated;
grant insert(user_id,note) on table public.verification_requests to authenticated;
drop policy if exists verification_insert_own on public.verification_requests;
create policy verification_insert_own on public.verification_requests
 for insert to authenticated with check (
 user_id=(select auth.uid())
 and status='pending'
 and reviewed_by is null
 and reviewed_at is null
 and not exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.is_verified)
);
drop policy if exists verification_select_own on public.verification_requests;
create policy verification_select_own on public.verification_requests
 for select to authenticated using (user_id=(select auth.uid()));
