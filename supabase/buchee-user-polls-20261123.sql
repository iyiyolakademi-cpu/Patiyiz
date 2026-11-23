-- Buchee user-created polls. Review and apply in Supabase SQL editor before enabling the UI.
create table if not exists public.buchee_polls (
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references auth.users(id) on delete cascade,
 question text not null check (char_length(trim(question)) between 5 and 280),
 options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 4),
 created_at timestamptz not null default now(),
 ends_at timestamptz not null,
 constraint buchee_poll_duration check (ends_at > created_at and ends_at <= created_at + interval '7 days')
);
create table if not exists public.buchee_poll_votes (
 poll_id uuid not null references public.buchee_polls(id) on delete cascade,
 voter_id uuid not null references auth.users(id) on delete cascade,
 option_index integer not null check(option_index between 0 and 3),
 created_at timestamptz not null default now(),
 primary key (poll_id, voter_id)
);
create index if not exists buchee_polls_author_date_idx on public.buchee_polls(author_id,created_at desc);
create index if not exists buchee_votes_poll_option_idx on public.buchee_poll_votes(poll_id,option_index);
alter table public.buchee_polls enable row level security;
alter table public.buchee_poll_votes enable row level security;
drop policy if exists buchee_poll_read on public.buchee_polls;
create policy buchee_poll_read on public.buchee_polls for select to authenticated using (true);
drop policy if exists buchee_poll_create on public.buchee_polls;
create policy buchee_poll_create on public.buchee_polls for insert to authenticated with check (author_id=auth.uid());
drop policy if exists buchee_poll_delete on public.buchee_polls;
create policy buchee_poll_delete on public.buchee_polls for delete to authenticated using (author_id=auth.uid());
-- Votes must go through the function, not unrestricted client INSERT.
revoke insert,update,delete on public.buchee_poll_votes from anon,authenticated;
drop policy if exists buchee_vote_read_self on public.buchee_poll_votes;
create policy buchee_vote_read_self on public.buchee_poll_votes for select to authenticated using (voter_id=auth.uid());
create or replace function public.buchee_cast_poll_vote(p_poll uuid,p_option integer)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.buchee_polls%rowtype;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into p from public.buchee_polls where id=p_poll;
 if not found then raise exception 'Poll not found'; end if;
 if now()>=p.ends_at then raise exception 'Poll closed'; end if;
 if p_option<0 or p_option>=jsonb_array_length(p.options) then raise exception 'Invalid option'; end if;
 insert into public.buchee_poll_votes(poll_id,voter_id,option_index) values(p_poll,auth.uid(),p_option);
end $$;
revoke all on function public.buchee_cast_poll_vote(uuid,integer) from public,anon;
grant execute on function public.buchee_cast_poll_vote(uuid,integer) to authenticated;
create or replace function public.buchee_poll_results(p_poll uuid)
returns table(option_index integer,votes bigint,total bigint)
language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.buchee_polls%rowtype;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into p from public.buchee_polls where id=p_poll;
 if not found then raise exception 'Poll not found'; end if;
 if p.author_id<>auth.uid() and now()<p.ends_at
    and not exists(select 1 from public.buchee_poll_votes v where v.poll_id=p_poll and v.voter_id=auth.uid())
 then raise exception 'Results available after voting or closing'; end if;
 return query select i, count(v.option_index), (select count(*) from public.buchee_poll_votes v2 where v2.poll_id=p_poll)
 from generate_series(0,jsonb_array_length(p.options)-1) i
 left join public.buchee_poll_votes v on v.poll_id=p_poll and v.option_index=i
 group by i order by i;
end $$;
revoke all on function public.buchee_poll_results(uuid) from public,anon;
grant execute on function public.buchee_poll_results(uuid) to authenticated;
