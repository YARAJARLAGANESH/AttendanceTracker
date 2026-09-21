create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  roll_number text,
  created_at timestamptz not null default now(),
  unique(group_id, roll_number)
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null,
  short_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(group_id, name)
);

create table if not exists public.timetable (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  start_time time not null,
  end_time time not null,
  class_group_id uuid,
  active_from date,
  active_until date,
  check (end_time > start_time),
  unique(group_id, day_of_week, start_time, end_time, subject_id)
);

create table if not exists public.academic_days (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  date date not null,
  day_type text not null check (day_type in ('NORMAL', 'HOLIDAY', 'SPECIAL_CLASS', 'EXAM', 'COLLEGE_EVENT')) default 'NORMAL',
  title text,
  description text,
  unique(group_id, date)
);

create index if not exists idx_students_group_id on public.students(group_id);
create index if not exists idx_students_user_id on public.students(user_id);
create index if not exists idx_subjects_group_id on public.subjects(group_id);
create index if not exists idx_timetable_group_day on public.timetable(group_id, day_of_week);
create index if not exists idx_timetable_subject on public.timetable(subject_id);
create index if not exists idx_academic_days_group_date on public.academic_days(group_id, date);

alter table public.students enable row level security;
alter table public.subjects enable row level security;
alter table public.timetable enable row level security;
alter table public.academic_days enable row level security;

create policy "group members can view students" on public.students
for select using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = public.students.group_id and gm.user_id = auth.uid()
  )
);

create policy "group admins can manage students" on public.students
for all using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = public.students.group_id and gm.user_id = auth.uid() and gm.role in ('owner', 'admin')
  )
) with check (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = public.students.group_id and gm.user_id = auth.uid() and gm.role in ('owner', 'admin')
  )
);

create policy "group members can view subjects" on public.subjects
for select using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = public.subjects.group_id and gm.user_id = auth.uid()
  )
);

create policy "group admins can manage subjects" on public.subjects
for all using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = public.subjects.group_id and gm.user_id = auth.uid() and gm.role in ('owner', 'admin')
  )
) with check (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = public.subjects.group_id and gm.user_id = auth.uid() and gm.role in ('owner', 'admin')
  )
);

create policy "group members can view timetable" on public.timetable
for select using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = public.timetable.group_id and gm.user_id = auth.uid()
  )
);

create policy "group admins can manage timetable" on public.timetable
for all using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = public.timetable.group_id and gm.user_id = auth.uid() and gm.role in ('owner', 'admin')
  )
) with check (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = public.timetable.group_id and gm.user_id = auth.uid() and gm.role in ('owner', 'admin')
  )
);

create policy "group members can view academic days" on public.academic_days
for select using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = public.academic_days.group_id and gm.user_id = auth.uid()
  )
);

create policy "group admins can manage academic days" on public.academic_days
for all using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = public.academic_days.group_id and gm.user_id = auth.uid() and gm.role in ('owner', 'admin')
  )
) with check (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = public.academic_days.group_id and gm.user_id = auth.uid() and gm.role in ('owner', 'admin')
  )
);

create or replace function public.seed_default_subjects_for_group(p_group_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.subjects (group_id, name, short_name)
  values
    (p_group_id, 'Computer Networks', 'CN'),
    (p_group_id, 'Software Engineering', 'SE'),
    (p_group_id, 'DBMS', 'DBMS'),
    (p_group_id, 'ML', 'ML'),
    (p_group_id, 'IPR', 'IPR'),
    (p_group_id, 'DAA', 'DAA'),
    (p_group_id, 'ML Lab', 'ML Lab'),
    (p_group_id, 'DBMS Lab', 'DBMS Lab'),
    (p_group_id, 'Skill Lab', 'Skill Lab'),
    (p_group_id, 'Internship', 'Internship')
  on conflict (group_id, name) do nothing;
end;
$$;
