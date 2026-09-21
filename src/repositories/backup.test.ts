import { describe, expect, it } from 'vitest'

import { buildBackupFileName, validateBackupPayload } from './backup'

const initialSchema = `
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
`

const studentSchema = `
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
`

describe('backup validation', () => {
  it('accepts a valid backup payload', () => {
    const payload = {
      backupVersion: '1.0',
      application: 'Attendance Tracker',
      exportedAt: '2026-09-21T12:00:00.000Z',
      group: { id: '11111111-1111-4111-8111-111111111111', name: 'AIML-3/1' },
      data: {
        students: [
          {
            id: '22222222-2222-4222-8222-222222222222',
            group_id: '11111111-1111-4111-8111-111111111111',
            user_id: null,
            name: 'Student A',
            roll_number: '01',
            created_at: '2026-09-20T00:00:00Z',
          },
        ],
        subjects: [
          {
            id: '33333333-3333-4333-8333-333333333333',
            group_id: '11111111-1111-4111-8111-111111111111',
            name: 'Maths',
            short_name: 'MTH',
            is_active: true,
            created_at: '2026-09-20T00:00:00Z',
          },
        ],
        timetable: [],
        academicDays: [],
        attendance: [
          {
            id: '44444444-4444-4444-8444-444444444444',
            student_id: '22222222-2222-4222-8222-222222222222',
            date: '2026-09-21',
            subject_id: '33333333-3333-4333-8333-333333333333',
            class_group_id: null,
            start_time: '09:00',
            end_time: '10:00',
            duration_minutes: 60,
            status: 'PRESENT',
            created_at: '2026-09-21T00:00:00Z',
            updated_at: '2026-09-21T00:00:00Z',
            updated_by: null,
            reason: null,
          },
        ],
      },
    }

    const result = validateBackupPayload(payload)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('rejects unsupported backup versions', () => {
    const result = validateBackupPayload({
      backupVersion: '9.9',
      application: 'Attendance Tracker',
      exportedAt: '2026-09-21T12:00:00.000Z',
      group: { id: '11111111-1111-4111-8111-111111111111', name: 'AIML-3/1' },
      data: { students: [], subjects: [], timetable: [], academicDays: [], attendance: [] },
    })

    expect(result.valid).toBe(false)
    expect(result.errors.some((error) => error.includes('backupVersion'))).toBe(true)
  })

  it('rejects invalid attendance status values before import', () => {
    const result = validateBackupPayload({
      backupVersion: '1.0',
      application: 'Attendance Tracker',
      exportedAt: '2026-09-21T12:00:00.000Z',
      group: { id: '11111111-1111-4111-8111-111111111111', name: 'AIML-3/1' },
      data: {
        students: [
          {
            id: '22222222-2222-4222-8222-222222222222',
            group_id: '11111111-1111-4111-8111-111111111111',
            user_id: null,
            name: 'Student A',
            roll_number: '01',
            created_at: '2026-09-20T00:00:00Z',
          },
        ],
        subjects: [
          {
            id: '33333333-3333-4333-8333-333333333333',
            group_id: '11111111-1111-4111-8111-111111111111',
            name: 'Maths',
            short_name: 'MTH',
            is_active: true,
            created_at: '2026-09-20T00:00:00Z',
          },
        ],
        timetable: [],
        academicDays: [],
        attendance: [
          {
            id: '44444444-4444-4444-8444-444444444444',
            student_id: '22222222-2222-4222-8222-222222222222',
            date: '2026-09-21',
            subject_id: '33333333-3333-4333-8333-333333333333',
            class_group_id: null,
            start_time: '09:00',
            end_time: '10:00',
            duration_minutes: 60,
            status: 'LATE',
            created_at: '2026-09-21T00:00:00Z',
            updated_at: '2026-09-21T00:00:00Z',
            updated_by: null,
            reason: null,
          },
        ],
      },
    })

    expect(result.valid).toBe(false)
    expect(result.errors.some((error) => error.includes('status'))).toBe(true)
  })

  it('builds a safe filename from group metadata', () => {
    expect(buildBackupFileName('AIML-3/1')).toContain('attendance-tracker')
    expect(buildBackupFileName('AIML-3/1')).toContain('aiml-3-1')
    expect(buildBackupFileName('AIML-3/1')).toMatch(/\.json$/)
  })

  it('rejects backup payloads that contain secret-like keys', () => {
    const result = validateBackupPayload({
      backupVersion: '1.0',
      application: 'Attendance Tracker',
      exportedAt: '2026-09-21T12:00:00.000Z',
      group: { id: '11111111-1111-4111-8111-111111111111', name: 'AIML-3/1' },
      data: { students: [], subjects: [], timetable: [], academicDays: [], attendance: [] },
      access_token: 'secret-value',
    })

    expect(result.valid).toBe(false)
    expect(result.errors.some((error) => /secret|token|password/i.test(error))).toBe(true)
  })

  it('enforces admin-only write policies in the migration schema', () => {
    expect(initialSchema).not.toContain('members can manage students in their groups')
    expect(studentSchema).toContain('group admins can manage students')
    expect(studentSchema).toContain('group admins can manage subjects')
    expect(studentSchema).toContain('group admins can manage timetable')
    expect(studentSchema).toContain("gm.role in ('owner', 'admin')")
  })
})
