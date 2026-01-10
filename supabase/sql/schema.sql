create extension if not exists "uuid-ossp";

do $$ begin
  create type public.app_role as enum ('admin','user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.leave_type as enum ('annual','sudden','sick','unpaid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.leave_status as enum ('pending','approved','rejected','cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.employees (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid unique not null,
  code text unique not null,
  full_name text not null,
  email text unique not null,
  role public.app_role not null default 'user',
  hiring_date date,
  annual_allowance int not null default 21,
  sudden_allowance int not null default 7,
  created_at timestamptz not null default now()
);

create table if not exists public.leave_requests (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  leave_type public.leave_type not null,
  reason text,
  status public.leave_status not null default 'pending',
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid,
  decision_note text,
  constraint start_before_end check (start_date <= end_date)
);

create or replace function public.leave_days_inclusive(p_start date, p_end date)
returns int
language sql
immutable
as $$
  select (p_end - p_start + 1)::int
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.employees e
    where e.user_id = auth.uid()
      and e.role = 'admin'
  )
$$;

alter table public.employees enable row level security;
alter table public.leave_requests enable row level security;

drop policy if exists "employees_select_own" on public.employees;
create policy "employees_select_own"
on public.employees
for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "employees_update_admin" on public.employees;
create policy "employees_update_admin"
on public.employees
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "employees_insert_admin" on public.employees;
create policy "employees_insert_admin"
on public.employees
for insert
with check (public.is_admin());

drop policy if exists "leave_select_own_or_admin" on public.leave_requests;
create policy "leave_select_own_or_admin"
on public.leave_requests
for select
using (
  public.is_admin()
  or employee_id in (select id from public.employees where user_id = auth.uid())
);

drop policy if exists "leave_insert_own" on public.leave_requests;
create policy "leave_insert_own"
on public.leave_requests
for insert
with check (
  employee_id in (select id from public.employees where user_id = auth.uid())
);

create or replace function public.set_employee_id()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.employee_id is null then
    select id into new.employee_id
    from public.employees
    where user_id = auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_employee_id on public.leave_requests;
create trigger trg_set_employee_id
before insert on public.leave_requests
for each row execute function public.set_employee_id();

drop policy if exists "leave_update_own_pending" on public.leave_requests;
create policy "leave_update_own_pending"
on public.leave_requests
for update
using (
  status = 'pending'
  and employee_id in (select id from public.employees where user_id = auth.uid())
)
with check (
  status in ('pending','cancelled')
  and employee_id in (select id from public.employees where user_id = auth.uid())
);

drop policy if exists "leave_update_admin" on public.leave_requests;
create policy "leave_update_admin"
on public.leave_requests
for update
using (public.is_admin())
with check (public.is_admin());

create or replace view public.v_leave_summary_current_year as
with me as (
  select e.*
  from public.employees e
  where e.user_id = auth.uid()
),
approved as (
  select
    lr.employee_id,
    lr.leave_type,
    sum(public.leave_days_inclusive(lr.start_date, lr.end_date))::int as used_days
  from public.leave_requests lr
  join me on me.id = lr.employee_id
  where lr.status = 'approved'
    and extract(year from lr.start_date) = extract(year from now())
  group by lr.employee_id, lr.leave_type
),
agg as (
  select
    me.id as employee_id,
    extract(year from now())::int as year,
    coalesce((select used_days from approved where leave_type='annual'),0) as annual_used,
    coalesce((select used_days from approved where leave_type='sudden'),0) as sudden_used,
    coalesce((select used_days from approved where leave_type='sick'),0) as sick_used
  from me
)
select
  agg.employee_id,
  agg.year,
  me.annual_allowance,
  me.sudden_allowance,
  agg.annual_used,
  agg.sudden_used,
  agg.sick_used,
  greatest(me.annual_allowance - agg.annual_used, 0) as annual_remaining,
  greatest(me.sudden_allowance - agg.sudden_used, 0) as sudden_remaining
from agg
join me on me.id = agg.employee_id;

create or replace view public.v_leave_summary as
select
  e.id as employee_id,
  extract(year from lr.start_date)::int as year,
  e.annual_allowance,
  e.sudden_allowance,
  sum(case when lr.status='approved' and lr.leave_type='annual' then public.leave_days_inclusive(lr.start_date, lr.end_date) else 0 end)::int as annual_used,
  sum(case when lr.status='approved' and lr.leave_type='sudden' then public.leave_days_inclusive(lr.start_date, lr.end_date) else 0 end)::int as sudden_used,
  sum(case when lr.status='approved' and lr.leave_type='sick' then public.leave_days_inclusive(lr.start_date, lr.end_date) else 0 end)::int as sick_used,
  greatest(e.annual_allowance - sum(case when lr.status='approved' and lr.leave_type='annual' then public.leave_days_inclusive(lr.start_date, lr.end_date) else 0 end), 0)::int as annual_remaining,
  greatest(e.sudden_allowance - sum(case when lr.status='approved' and lr.leave_type='sudden' then public.leave_days_inclusive(lr.start_date, lr.end_date) else 0 end), 0)::int as sudden_remaining
from public.employees e
left join public.leave_requests lr on lr.employee_id = e.id
group by e.id, year, e.annual_allowance, e.sudden_allowance;
