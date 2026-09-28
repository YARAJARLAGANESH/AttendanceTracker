create table if not exists public.attendance_adjustments (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references public.attendance(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  attendance_date date not null,
  previous_status public.attendance_status not null,
  new_status public.attendance_status not null,
  reason text not null check (length(trim(reason)) > 0 and length(trim(reason)) <= 500),
  adjusted_by uuid not null references public.profiles(id) on delete restrict,
  adjusted_at timestamptz not null default now(),
  check (previous_status <> new_status)
);

create index if not exists idx_attendance_adjustments_group_time on public.attendance_adjustments(group_id, adjusted_at desc);
create index if not exists idx_attendance_adjustments_student_time on public.attendance_adjustments(student_id, adjusted_at desc);
create index if not exists idx_attendance_adjustments_attendance on public.attendance_adjustments(attendance_id);

alter table public.attendance_adjustments enable row level security;

create policy "group members can view audit records for their group" on public.attendance_adjustments
for select using (
  exists (
    select 1
    from public.group_members gm
    where gm.group_id = public.attendance_adjustments.group_id and gm.user_id = auth.uid()
  )
);

create policy "owners and admins can insert audit records for their group" on public.attendance_adjustments
for insert with check (
  auth.uid() = adjusted_by
  and exists (
    select 1
    from public.group_members gm
    where gm.group_id = public.attendance_adjustments.group_id and gm.user_id = auth.uid() and gm.role in ('owner', 'admin')
  )
);

create policy "audit records are immutable to ordinary users" on public.attendance_adjustments
for update using (false) with check (false);

create policy "audit records cannot be deleted by ordinary users" on public.attendance_adjustments
for delete using (false);

create or replace function public.adjust_attendance_record(
  p_attendance_id uuid,
  p_new_status public.attendance_status,
  p_reason text,
  p_expected_previous_status public.attendance_status default null
)
returns public.attendance
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attendance public.attendance%rowtype;
  v_user_id uuid := auth.uid();
  v_group_id uuid;
  v_role public.user_role;
  v_reason text;
begin
  if v_user_id is null then
    raise exception 'Authentication required for manual attendance adjustment.';
  end if;

  select * into v_attendance
  from public.attendance
  where id = p_attendance_id
  for update;

  if not found then
    raise exception 'Attendance record not found.';
  end if;

  if p_expected_previous_status is not null and v_attendance.status <> p_expected_previous_status then
    raise exception 'Attendance record has changed since it was loaded. Please refresh and review the latest version.';
  end if;

  if p_new_status = v_attendance.status then
    raise exception 'A manual adjustment requires a different attendance status.';
  end if;

  v_reason := trim(p_reason);
  if length(v_reason) = 0 then
    raise exception 'A reason is required for every manual attendance adjustment.';
  end if;

  if length(v_reason) > 500 then
    raise exception 'The adjustment reason is too long. It must be 500 characters or fewer.';
  end if;

  select gm.role into v_role
  from public.students s
  join public.group_members gm on gm.group_id = s.group_id
  where s.id = v_attendance.student_id and gm.user_id = v_user_id
  limit 1;

  if v_role is null or v_role not in ('owner', 'admin') then
    raise exception 'Only owners and admins can adjust attendance records.';
  end if;

  v_group_id := (
    select s.group_id
    from public.students s
    where s.id = v_attendance.student_id
  );

  update public.attendance
  set status = p_new_status,
      reason = v_reason,
      updated_by = v_user_id,
      updated_at = now()
  where id = p_attendance_id;

  insert into public.attendance_adjustments (
    attendance_id,
    group_id,
    student_id,
    subject_id,
    attendance_date,
    previous_status,
    new_status,
    reason,
    adjusted_by
  ) values (
    v_attendance.id,
    v_group_id,
    v_attendance.student_id,
    v_attendance.subject_id,
    v_attendance.date,
    v_attendance.status,
    p_new_status,
    v_reason,
    v_user_id
  );

  select * into v_attendance
  from public.attendance
  where id = p_attendance_id;

  return v_attendance;
end;
$$;
