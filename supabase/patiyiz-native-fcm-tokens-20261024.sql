-- Android FCM registration. Web Push and existing notification rows remain unchanged.
create table if not exists public.patiyiz_native_push_tokens(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 token text not null unique,
 platform text not null default 'android' check(platform='android'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint patiyiz_fcm_token_length check(char_length(token) between 40 and 4096)
);
create index if not exists patiyiz_native_push_tokens_owner_idx on public.patiyiz_native_push_tokens(user_id);
alter table public.patiyiz_native_push_tokens enable row level security;
revoke all on public.patiyiz_native_push_tokens from public,anon,authenticated;
grant select,insert,update,delete on public.patiyiz_native_push_tokens to authenticated;
drop policy if exists "native_token_read_self" on public.patiyiz_native_push_tokens;
create policy "native_token_read_self" on public.patiyiz_native_push_tokens for select to authenticated
 using(user_id=(select auth.uid()));
drop policy if exists "native_token_insert_self" on public.patiyiz_native_push_tokens;
create policy "native_token_insert_self" on public.patiyiz_native_push_tokens for insert to authenticated
 with check(user_id=(select auth.uid()));
drop policy if exists "native_token_update_self" on public.patiyiz_native_push_tokens;
create policy "native_token_update_self" on public.patiyiz_native_push_tokens for update to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists "native_token_delete_self" on public.patiyiz_native_push_tokens;
create policy "native_token_delete_self" on public.patiyiz_native_push_tokens for delete to authenticated
 using(user_id=(select auth.uid()));
