-- Account transparency exposes only a join month and an opt-in country.
create table public.buchee_account_country (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 country_code text,
 show_country boolean not null default false,
 constraint buchee_account_country_code check (country_code in ('AD','AE','AF','AG','AI','AL','AM','AO','AQ','AR','AS','AT','AU','AW','AX','AZ','BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS','BT','BV','BW','BY','BZ','CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CN','CO','CR','CU','CV','CW','CX','CY','CZ','DE','DJ','DK','DM','DO','DZ','EC','EE','EG','EH','ER','ES','ET','FI','FJ','FK','FM','FO','FR','GA','GB','GD','GE','GF','GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY','HK','HM','HN','HR','HT','HU','ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT','JE','JM','JO','JP','KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ','LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY','MA','MC','MD','ME','MF','MG','MH','MK','ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ','NA','NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ','OM','PA','PE','PF','PG','PH','PK','PL','PM','PN','PR','PS','PT','PW','PY','QA','RE','RO','RS','RU','RW','SA','SB','SC','SD','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS','ST','SV','SX','SY','SZ','TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO','TR','TT','TV','TW','TZ','UA','UG','UM','US','UY','UZ','VA','VC','VE','VG','VI','VN','VU','WF','WS','YE','YT','ZA','ZM','ZW')),
 constraint buchee_account_country_visible check (not show_country or country_code is not null)
);

alter table public.buchee_account_country enable row level security;
revoke all on public.buchee_account_country from public, anon, authenticated;
grant select, insert, update on public.buchee_account_country to authenticated;
create policy buchee_account_country_select on public.buchee_account_country
 for select to authenticated using (user_id = (select auth.uid()));
create policy buchee_account_country_insert on public.buchee_account_country
 for insert to authenticated with check (user_id = (select auth.uid()));
create policy buchee_account_country_update on public.buchee_account_country
 for update to authenticated using (user_id = (select auth.uid()))
 with check (user_id = (select auth.uid()));

create function public.buchee_account_about(p_account_id uuid)
returns table (joined_month date, country_code text)
language sql
stable
security definer
set search_path = ''
as $function$
 select pg_catalog.date_trunc('month', u.created_at at time zone 'UTC')::date,
        case when c.show_country then c.country_code end
 from public.profiles as p
 join auth.users as u on u.id = p.id
 left join public.buchee_account_country as c on c.user_id = p.id
 cross join (select auth.uid() as viewer_id) as viewer
 where p.id = p_account_id
   and viewer.viewer_id is not null
   and (
    viewer.viewer_id = p.id
    or (
     not exists (
      select 1 from public.user_blocks as b
      where (b.blocker_id = viewer.viewer_id and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = viewer.viewer_id)
     )
     and (
      not p.is_private
      or exists (select 1 from public.follows as f where f.follower_id = viewer.viewer_id and f.followee_id = p.id)
     )
    )
   )
$function$;

revoke all on function public.buchee_account_about(uuid) from public, anon, authenticated;
grant execute on function public.buchee_account_about(uuid) to authenticated;
