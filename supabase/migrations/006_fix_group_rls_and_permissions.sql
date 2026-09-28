-- Fix group RLS recursion and permissions

-- Helper function to check group membership
create or replace function public.is_group_member(target_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = auth.uid()
  );
$$;


-- Helper function to check group admin/owner
create or replace function public.is_group_admin(target_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = auth.uid()
      and gm.role in ('owner', 'admin')
  );
$$;


-- Remove recursive group policies
drop policy if exists "group members can view group" on public.groups;
drop policy if exists "users can view groups they belong to" on public.groups;
drop policy if exists "owners and admins can insert groups" on public.groups;
drop policy if exists "owners and admins can update groups" on public.groups;
drop policy if exists "owners and admins can delete groups" on public.groups;

drop policy if exists "owners and admins can manage memberships" on public.group_members;


-- Groups policies
create policy "users can view groups they belong to"
on public.groups
for select
using (
  public.is_group_member(id)
);

create policy "users can create their own groups"
on public.groups
for insert
with check (
  auth.uid() = created_by
);

create policy "owners and admins can update groups"
on public.groups
for update
using (
  public.is_group_admin(id)
)
with check (
  public.is_group_admin(id)
);

create policy "owners and admins can delete groups"
on public.groups
for delete
using (
  public.is_group_admin(id)
);


-- Group membership policy
create policy "owners and admins can manage memberships"
on public.group_members
for all
using (
  public.is_group_admin(group_id)
)
with check (
  public.is_group_admin(group_id)
);


-- Permissions for authenticated users
grant select, insert, update, delete on public.groups to authenticated;
grant select, insert, update, delete on public.group_members to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.students to authenticated;
grant select, insert, update, delete on public.subjects to authenticated;
grant select, insert, update, delete on public.timetable to authenticated;
grant select, insert, update, delete on public.academic_days to authenticated;
grant select, insert, update, delete on public.attendance to authenticated;
grant select, insert, update, delete on public.attendance_adjustments to authenticated;


-- Reload PostgREST schema
notify pgrst, 'reload schema';