import { describe, expect, it } from 'vitest'

import type { AttendanceRecord } from '../types/database'
import { buildRecentAttendance } from './dashboard'

describe('dashboard recent attendance', () => {
  it('shows recent attendance status labels without inventing missing data', () => {
    const records: AttendanceRecord[] = [
      {
        id: 'r1',
        student_id: 's1',
        date: '2026-09-21',
        subject_id: 'sub1',
        class_group_id: null,
        start_time: '09:30',
        end_time: '10:30',
        duration_minutes: 60,
        status: 'PRESENT',
        created_at: '2026-09-21T00:00:00Z',
        updated_at: '2026-09-21T00:00:00Z',
        updated_by: null,
        reason: null,
      },
      {
        id: 'r2',
        student_id: 's1',
        date: '2026-09-20',
        subject_id: 'sub2',
        class_group_id: null,
        start_time: '10:30',
        end_time: '11:30',
        duration_minutes: 60,
        status: 'ABSENT',
        created_at: '2026-09-20T00:00:00Z',
        updated_at: '2026-09-20T00:00:00Z',
        updated_by: null,
        reason: null,
      },
      {
        id: 'r3',
        student_id: 's1',
        date: '2026-09-19',
        subject_id: 'sub3',
        class_group_id: null,
        start_time: '13:30',
        end_time: '16:30',
        duration_minutes: 180,
        status: 'NOT_CONDUCTED',
        created_at: '2026-09-19T00:00:00Z',
        updated_at: '2026-09-19T00:00:00Z',
        updated_by: null,
        reason: null,
      },
    ]

    const subjects = [
      { id: 'sub1', group_id: 'g1', name: 'Computer Networks', short_name: null, is_active: true, created_at: '2026-09-01T00:00:00Z' },
      { id: 'sub2', group_id: 'g1', name: 'Software Engineering', short_name: null, is_active: true, created_at: '2026-09-01T00:00:00Z' },
      { id: 'sub3', group_id: 'g1', name: 'DBMS Lab', short_name: null, is_active: true, created_at: '2026-09-01T00:00:00Z' },
    ]

    const recent = buildRecentAttendance(records, subjects, 3)

    expect(recent).toHaveLength(3)
    expect(recent[0]).toMatchObject({ date: '2026-09-21', subjectName: 'Computer Networks', status: 'PRESENT' })
    expect(recent[1]).toMatchObject({ date: '2026-09-20', subjectName: 'Software Engineering', status: 'ABSENT' })
    expect(recent[2]).toMatchObject({ date: '2026-09-19', subjectName: 'DBMS Lab', status: 'NOT_CONDUCTED' })
  })
})
