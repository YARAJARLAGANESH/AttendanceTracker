create extension if not exists pgcrypto;

create type public.user_role as enum ('owner', 'admin', 'member');
create type public.attendance_status as enum ('PRESENT', 'ABSENT', 'NOT_CONDUCTED');
create type public.day_type as enum ('NORMAL', 'HOLIDAY', 'SPECIAL_CLASS', 'EXAM', 'COLLEGE_EVENT');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  college_name text not null,
  class_name text not null,
  academic_year text not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.user_role not null default 'member',
  joined_at timestamptz not null default now(),
  unique(group_id, user_id)
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid references public.profiles(id),
  name text not null,
  roll_number text,
  created_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null,
  short_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
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
  active_until date
);

create table if not exists public.academic_days (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  date date not null,
  day_type public.day_type not null default 'NORMAL',
  title text,
  description text,
  unique(group_id, date)
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  date date not null,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  class_group_id uuid,
  start_time time not null,
  end_time time not null,
  duration_minutes integer not null check (duration_minutes > 0),
  status public.attendance_status not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  reason text,
  unique(student_id, date, subject_id, start_time, end_time)
);

create index if not exists idx_groups_created_by on public.groups(created_by);
create index if not exists idx_group_members_group_id on public.group_members(group_id);
create index if not exists idx_group_members_user_id on public.group_members(user_id);
create index if not exists idx_students_group_id on public.students(group_id);
create index if not exists idx_subjects_group_id on public.subjects(group_id);
create index if not exists idx_timetable_group_day on public.timetable(group_id, day_of_week);
create index if not exists idx_attendance_student_date on public.attendance(student_id, date);
create index if not exists idx_attendance_group_subject on public.attendance(subject_id);

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.students enable row level security;
alter table public.subjects enable row level security;
alter table public.timetable enable row level security;
alter table public.academic_days enable row level security;
alter table public.attendance enable row level security;

create policy "profiles are viewable by owner" on public.profiles
for select using (auth.uid() = id);

create policy "profiles can insert own record" on public.profiles
for insert with check (auth.uid() = id);

create policy "profiles can update own record" on public.profiles
for update using (auth.uid() = id);

create policy "group members can view group" on public.groups
for select using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = public.groups.id and gm.user_id = auth.uid()
  )
);

create policy "users can manage their own group membership" on public.group_members
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "members can view students in their groups" on public.students
for select using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = public.students.group_id and gm.user_id = auth.uid()
  )
);

create policy "owners and admins can manage students in their groups" on public.students
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

create policy "members can view subjects in their groups" on public.subjects
for select using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = public.subjects.group_id and gm.user_id = auth.uid()
  )
);

create policy "owners and admins can manage subjects in their groups" on public.subjects
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

create policy "members can view timetable in their groups" on public.timetable
for select using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = public.timetable.group_id and gm.user_id = auth.uid()
  )
);

create policy "owners and admins can manage timetable in their groups" on public.timetable
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

create policy "members can view academic days in their groups" on public.academic_days
for select using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = public.academic_days.group_id and gm.user_id = auth.uid()
  )
);

create policy "owners and admins can manage academic days in their groups" on public.academic_days
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

create policy "members can view attendance in their groups" on public.attendance
for select using (
  exists (
    select 1
    from public.students s
    join public.group_members gm on gm.group_id = s.group_id
    where s.id = public.attendance.student_id and gm.user_id = auth.uid()
  )
);

create policy "owners and admins can manage attendance in their groups" on public.attendance
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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
