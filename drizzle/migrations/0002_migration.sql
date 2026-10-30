create or replace function public.admin_set_plan(_email text, _plan_id text, _reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Not authorized'; end if;
  select id into v_uid from auth.users where lower(email) = lower(trim(_email)) limit 1;
  if v_uid is null then raise exception 'No account with that email'; end if;
  if _plan_id = 'none' then
    delete from subscription_overrides where user_id = v_uid;
  else
    if not exists (select 1 from plan_limits where plan_id = _plan_id) then raise exception 'Unknown plan'; end if;
    insert into subscription_overrides(user_id, plan_id, reason, set_by, updated_at)
    values (v_uid, _plan_id, left(_reason, 300), auth.uid(), now())
    on conflict (user_id) do update set plan_id = excluded.plan_id, reason = excluded.reason, set_by = excluded.set_by, updated_at = now();
  end if;
  insert into subscription_audit(target_user_id, actor_id, action, details)
  values (v_uid, auth.uid(), 'manual_plan_change', jsonb_build_object('plan_id', _plan_id, 'reason', left(_reason, 300), 'email', _email));
end $$;
revoke execute on function public.admin_set_plan(text, text, text) from public, anon;
grant execute on function public.admin_set_plan(text, text, text) to authenticated;

create or replace function public.admin_subscription_summary(_env text default 'live')
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Not authorized'; end if;
  return jsonb_build_object(
    'by_plan', coalesce((select jsonb_object_agg(product_id, n) from (select product_id, count(*) n from subscriptions where environment = _env and status in ('active','trialing','past_due') group by product_id) s), '{}'::jsonb),
    'by_status', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from subscriptions where environment = _env group by status) s), '{}'::jsonb),
    'past_due', (select count(*) from subscriptions where environment = _env and status = 'past_due'),
    'overrides', (select count(*) from subscription_overrides),
    'recent_audit', coalesce((select jsonb_agg(a) from (select action, details, created_at from subscription_audit order by created_at desc limit 10) a), '[]'::jsonb)
  );
end $$;
revoke execute on function public.admin_subscription_summary(text) from public, anon;
grant execute on function public.admin_subscription_summary(text) to authenticated;

-- fix override precedence: paid subscription wins, otherwise manual override, otherwise free
create or replace function public.get_entitlements(_user_id uuid, _env text default 'live')
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_plan text := 'free'; v_sub record; v_found boolean; v_period_start timestamptz; v_used int; v_lim record; v_preview boolean; v_override text;
begin
  select preview_mode into v_preview from app_settings where id;
  select * into v_sub from subscriptions
   where user_id = _user_id and environment = _env
     and ((status in ('active','trialing','past_due') and (current_period_end is null or current_period_end > now()))
       or (status = 'canceled' and current_period_end > now()))
   order by created_at desc limit 1;
  v_found := found;
  if v_found then
    v_plan := v_sub.product_id; v_period_start := v_sub.current_period_start;
  else
    select plan_id into v_override from subscription_overrides where user_id = _user_id;
    if v_override is not null then v_plan := v_override; end if;
  end if;
  if v_period_start is null then v_period_start := date_trunc('month', now()); end if;
  select count(*) into v_used from usage_events where user_id = _user_id and kind = 'analysis' and created_at >= v_period_start;
  select * into v_lim from plan_limits where plan_id = coalesce(v_plan,'free');
  if not found then select * into v_lim from plan_limits where plan_id = 'free'; end if;
  return jsonb_build_object('plan_id', v_lim.plan_id, 'plan_name', v_lim.name, 'preview_mode', coalesce(v_preview,true),
    'analyses_limit', v_lim.analyses_per_month, 'analyses_used', v_used, 'max_upload_mb', v_lim.max_upload_mb,
    'saved_dashboards', v_lim.saved_dashboards, 'team_members', v_lim.team_members, 'period_start', v_period_start,
    'period_end', case when v_found then v_sub.current_period_end end,
    'status', case when v_found then v_sub.status else 'none' end,
    'cancel_at_period_end', case when v_found then v_sub.cancel_at_period_end else false end);
end $$;