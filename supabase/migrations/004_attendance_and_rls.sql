create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  date date not null,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  class_group_id uuid,
  start_time time not null,
  end_time time not null,
  duration_minutes integer not null check (duration_minutes > 0),
  status text not null check (status in ('PRESENT', 'ABSENT', 'NOT_CONDUCTED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  reason text,
  unique(student_id, date, subject_id, start_time, end_time)
);

create index if not exists idx_attendance_student_date on public.attendance(student_id, date);
create index if not exists idx_attendance_subject on public.attendance(subject_id);
create index if not exists idx_attendance_date on public.attendance(date);

alter table public.attendance enable row level security;

create policy "group members can view attendance for their group" on public.attendance
for select using (
  exists (
    select 1
    from public.students s
    join public.group_members gm on gm.group_id = s.group_id
    where s.id = public.attendance.student_id and gm.user_id = auth.uid()
  )
);

create policy "group admins can manage attendance" on public.attendance
for all using (
  exists (
    select 1
    from public.students s
    join public.group_members gm on gm.group_id = s.group_id
    where s.id = public.attendance.student_id and gm.user_id = auth.uid() and gm.role in ('owner', 'admin')
  )
) with check (
  exists (
    select 1
    from public.students s
    join public.group_members gm on gm.group_id = s.group_id
    where s.id = public.attendance.student_id and gm.user_id = auth.uid() and gm.role in ('owner', 'admin')
  )
);

create or replace function public.set_attendance_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists attendance_updated_at_trigger on public.attendance;
create trigger attendance_updated_at_trigger
before update on public.attendance
for each row execute procedure public.set_attendance_updated_at();
