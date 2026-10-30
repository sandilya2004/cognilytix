create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  paddle_subscription_id text not null unique,
  paddle_customer_id text not null,
  product_id text not null,
  price_id text not null,
  status text not null default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  environment text not null default 'sandbox',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_subscriptions_user on public.subscriptions(user_id);
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
alter table public.subscriptions enable row level security;
create policy "Own subscriptions readable" on public.subscriptions for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create table public.plan_limits (
  plan_id text primary key,
  name text not null,
  analyses_per_month integer,
  max_upload_mb integer not null,
  saved_dashboards integer,
  team_members integer not null default 1,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
grant select on public.plan_limits to anon, authenticated;
grant update on public.plan_limits to authenticated;
grant all on public.plan_limits to service_role;
alter table public.plan_limits enable row level security;
create policy "Plan limits public" on public.plan_limits for select to anon, authenticated using (true);
create policy "Admins edit plan limits" on public.plan_limits for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
insert into public.plan_limits (plan_id,name,analyses_per_month,max_upload_mb,saved_dashboards,team_members,sort_order) values
 ('free','Free',3,25,1,1,0),('starter_plan','Starter',20,100,5,1,1),('professional_plan','Professional',100,250,20,1,2),('business_plan','Business',250,500,null,5,3);

create table public.app_settings (
  id boolean primary key default true check (id),
  preview_mode boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
grant select on public.app_settings to anon, authenticated;
grant update on public.app_settings to authenticated;
grant all on public.app_settings to service_role;
alter table public.app_settings enable row level security;
create policy "Settings public" on public.app_settings for select to anon, authenticated using (true);
create policy "Admins edit settings" on public.app_settings for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
insert into public.app_settings (id) values (true);

create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null default 'analysis',
  feature text,
  created_at timestamptz not null default now()
);
create index idx_usage_user_time on public.usage_events(user_id, created_at);
grant select on public.usage_events to authenticated;
grant all on public.usage_events to service_role;
alter table public.usage_events enable row level security;
create policy "Own usage readable" on public.usage_events for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create table public.subscription_overrides (
  user_id uuid primary key,
  plan_id text not null references public.plan_limits(plan_id),
  reason text,
  set_by uuid,
  updated_at timestamptz not null default now()
);
grant select on public.subscription_overrides to authenticated;
grant all on public.subscription_overrides to service_role;
alter table public.subscription_overrides enable row level security;
create policy "Own override readable" on public.subscription_overrides for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create table public.subscription_audit (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null,
  actor_id uuid,
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);
grant select on public.subscription_audit to authenticated;
grant all on public.subscription_audit to service_role;
alter table public.subscription_audit enable row level security;
create policy "Admins read audit" on public.subscription_audit for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- current plan for a user in an environment
create or replace function public.get_entitlements(_user_id uuid, _env text default 'live')
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_plan text := 'free'; v_sub record; v_period_start timestamptz; v_used int; v_lim record; v_preview boolean;
begin
  select preview_mode into v_preview from app_settings where id;
  select * into v_sub from subscriptions
   where user_id = _user_id and environment = _env
     and ((status in ('active','trialing','past_due') and (current_period_end is null or current_period_end > now()))
       or (status = 'canceled' and current_period_end > now()))
   order by created_at desc limit 1;
  if found then v_plan := v_sub.product_id; v_period_start := v_sub.current_period_start; end if;
  select plan_id into v_plan from subscription_overrides where user_id = _user_id and v_sub.id is null union all select v_plan limit 1;
  if v_period_start is null then v_period_start := date_trunc('month', now()); end if;
  select count(*) into v_used from usage_events where user_id = _user_id and kind = 'analysis' and created_at >= v_period_start;
  select * into v_lim from plan_limits where plan_id = coalesce(v_plan,'free');
  return jsonb_build_object('plan_id', v_lim.plan_id, 'plan_name', v_lim.name, 'preview_mode', coalesce(v_preview,true),
    'analyses_limit', v_lim.analyses_per_month, 'analyses_used', v_used, 'max_upload_mb', v_lim.max_upload_mb,
    'saved_dashboards', v_lim.saved_dashboards, 'team_members', v_lim.team_members, 'period_start', v_period_start,
    'period_end', v_sub.current_period_end, 'status', coalesce(v_sub.status, 'none'), 'cancel_at_period_end', coalesce(v_sub.cancel_at_period_end,false));
end $$;
revoke execute on function public.get_entitlements(uuid, text) from public, anon, authenticated;
grant execute on function public.get_entitlements(uuid, text) to service_role;

create or replace function public.get_my_entitlements(_env text default 'live')
returns jsonb language sql stable security definer set search_path = public as $$
  select public.get_entitlements(auth.uid(), _env) where auth.uid() is not null;
$$;
revoke execute on function public.get_my_entitlements(text) from public, anon;
grant execute on function public.get_my_entitlements(text) to authenticated;