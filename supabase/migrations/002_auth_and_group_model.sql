create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
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
  role text not null check (role in ('owner', 'admin', 'member')) default 'member',
  joined_at timestamptz not null default now(),
  unique(group_id, user_id)
);

create index if not exists idx_groups_created_by on public.groups(created_by);
create index if not exists idx_group_members_group_id on public.group_members(group_id);
create index if not exists idx_group_members_user_id on public.group_members(user_id);

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;

create policy "profiles are viewable by owner" on public.profiles
for select using (auth.uid() = id);

create policy "profiles can insert own profile" on public.profiles
for insert with check (auth.uid() = id);

create policy "profiles can update own profile" on public.profiles
for update using (auth.uid() = id);

create policy "users can view groups they belong to" on public.groups
for select using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = public.groups.id and gm.user_id = auth.uid()
  )
);

create policy "owners and admins can insert groups" on public.groups
for insert with check (
  auth.uid() = created_by
  or exists (
    select 1 from public.group_members gm
    where gm.group_id = public.groups.id and gm.user_id = auth.uid() and gm.role in ('owner', 'admin')
  )
);

create policy "owners and admins can update groups" on public.groups
for update using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = public.groups.id and gm.user_id = auth.uid() and gm.role in ('owner', 'admin')
  )
);

create policy "owners and admins can delete groups" on public.groups
for delete using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = public.groups.id and gm.user_id = auth.uid() and gm.role = 'owner'
  )
);

create policy "users can view their own memberships" on public.group_members
for select using (user_id = auth.uid());

create policy "owners and admins can manage memberships" on public.group_members
for all using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = public.group_members.group_id and gm.user_id = auth.uid() and gm.role in ('owner', 'admin')
  )
) with check (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = public.group_members.group_id and gm.user_id = auth.uid() and gm.role in ('owner', 'admin')
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
