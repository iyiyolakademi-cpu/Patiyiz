-- Patiyiz group member add: admins only; max 20 members per group.
create or replace function public.patiyiz_group_add_member(p_group uuid,p_user uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_caller uuid := auth.uid(); v_count integer;
begin
 if v_caller is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from public.patiyiz_group_members
  where group_id=p_group and user_id=v_caller and role='admin')
 then raise exception 'Only group admins can add members'; end if;
 if exists(select 1 from public.patiyiz_group_members where group_id=p_group and user_id=p_user) then return; end if;
 if public.patiyiz_users_blocked(v_caller,p_user) then raise exception 'User is blocked'; end if;
 select count(*) into v_count from public.patiyiz_group_members where group_id=p_group;
 if v_count>=20 then raise exception 'Maximum 20 participants'; end if;
 insert into public.patiyiz_group_members(group_id,user_id,role) values(p_group,p_user,'member');
end;
$$;
revoke all on function public.patiyiz_group_add_member(uuid,uuid) from public,anon;
grant execute on function public.patiyiz_group_add_member(uuid,uuid) to authenticated;