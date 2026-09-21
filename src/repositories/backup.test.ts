import { describe, expect, it } from 'vitest'

import { buildBackupFileName, validateBackupPayload } from './backup'

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
})
