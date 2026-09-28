import { describe, expect, it } from 'vitest'

import type { AttendanceRecord, Student, Subject } from '../types/database'
import {
  buildLowAttendanceItems,
  buildMonthlyAttendance,
  buildOverallReportSummary,
  buildStudentAttendance,
  buildSubjectAttendance,
  buildWeeklyAttendance,
  filterAttendanceRecordsByRange,
} from './reports'

describe('phase 7 report calculations', () => {
  const subjects: Subject[] = [
    { id: 'sub1', group_id: 'g1', name: 'Maths', short_name: 'MTH', is_active: true, created_at: '2026-09-01T00:00:00Z' },
    { id: 'sub2', group_id: 'g1', name: 'DBMS', short_name: 'DBMS', is_active: true, created_at: '2026-09-01T00:00:00Z' },
  ]

  const students: Student[] = [
    { id: 's1', group_id: 'g1', user_id: null, name: 'Student A', roll_number: '01', created_at: '2026-09-01T00:00:00Z' },
    { id: 's2', group_id: 'g1', user_id: null, name: 'Student B', roll_number: '02', created_at: '2026-09-01T00:00:00Z' },
  ]

  const records: AttendanceRecord[] = [
    { id: 'r1', student_id: 's1', date: '2026-09-16', subject_id: 'sub1', class_group_id: null, start_time: '09:30', end_time: '10:30', duration_minutes: 60, status: 'PRESENT', created_at: '2026-09-16T00:00:00Z', updated_at: '2026-09-16T00:00:00Z', updated_by: null, reason: null },
    { id: 'r2', student_id: 's1', date: '2026-09-16', subject_id: 'sub2', class_group_id: null, start_time: '10:30', end_time: '11:30', duration_minutes: 60, status: 'ABSENT', created_at: '2026-09-16T00:00:00Z', updated_at: '2026-09-16T00:00:00Z', updated_by: null, reason: null },
    { id: 'r3', student_id: 's1', date: '2026-09-17', subject_id: 'sub1', class_group_id: null, start_time: '09:30', end_time: '10:30', duration_minutes: 60, status: 'PRESENT', created_at: '2026-09-17T00:00:00Z', updated_at: '2026-09-17T00:00:00Z', updated_by: null, reason: null },
    { id: 'r4', student_id: 's2', date: '2026-09-17', subject_id: 'sub1', class_group_id: null, start_time: '09:30', end_time: '10:30', duration_minutes: 60, status: 'ABSENT', created_at: '2026-09-17T00:00:00Z', updated_at: '2026-09-17T00:00:00Z', updated_by: null, reason: null },
    { id: 'r5', student_id: 's2', date: '2026-09-18', subject_id: 'sub1', class_group_id: null, start_time: '09:30', end_time: '10:30', duration_minutes: 60, status: 'PRESENT', created_at: '2026-09-18T00:00:00Z', updated_at: '2026-09-18T00:00:00Z', updated_by: null, reason: null },
    { id: 'r6', student_id: 's1', date: '2026-09-18', subject_id: 'sub2', class_group_id: null, start_time: '09:30', end_time: '10:30', duration_minutes: 60, status: 'NOT_CONDUCTED', created_at: '2026-09-18T00:00:00Z', updated_at: '2026-09-18T00:00:00Z', updated_by: null, reason: 'Cancelled' },
  ]

  it('calculates the weighted overall report from actual conducted periods', () => {
    const summary = buildOverallReportSummary(records)

    expect(summary.present).toBe(180)
    expect(summary.absent).toBe(120)
    expect(summary.conducted).toBe(300)
    expect(summary.percentage).toBeCloseTo(60)
    expect(summary.warning).toBe(true)
  })

  it('groups subject attendance by subject using actual conducted durations', () => {
    const summary = buildSubjectAttendance(records, subjects)

    expect(summary).toHaveLength(2)
    expect(summary[0]).toMatchObject({ subjectId: 'sub1', subjectName: 'Maths', present: 180, absent: 60, conducted: 240, percentage: 75 })
    expect(summary[1]).toMatchObject({ subjectId: 'sub2', subjectName: 'DBMS', present: 0, absent: 60, conducted: 60, percentage: 0 })
  })

  it('groups attendance by week and month using actual registered records', () => {
    const weekly = buildWeeklyAttendance(records)
    const monthly = buildMonthlyAttendance(records)

    expect(weekly[0]).toMatchObject({ startDate: '2026-09-14', endDate: '2026-09-20', conducted: 300, present: 180, absent: 120, percentage: 60 })
    expect(monthly[0]).toMatchObject({ month: '2026-09', conducted: 300, present: 180, absent: 120, percentage: 60 })
  })

  it('filters records by date range and preserves the correct semantics', () => {
    const filtered = filterAttendanceRecordsByRange(records, '2026-09-17', '2026-09-18')

    expect(filtered).toHaveLength(4)
    expect(filtered.every((record) => record.date >= '2026-09-17' && record.date <= '2026-09-18')).toBe(true)
  })

  it('builds low-attendance identifiers from the threshold rule', () => {
    const lowAttendance = buildLowAttendanceItems(buildSubjectAttendance(records, subjects))

    expect(lowAttendance).toHaveLength(1)
    expect(lowAttendance[0]).toMatchObject({ type: 'subject', identifier: 'DBMS', percentage: 0 })
  })

  it('summarizes student attendance consistently', () => {
    const studentSummary = buildStudentAttendance(records, students)

    expect(studentSummary).toHaveLength(2)
    expect(studentSummary[0]).toMatchObject({ studentId: 's1', studentName: 'Student A', present: 120, absent: 60, conducted: 180 })
    expect(studentSummary[1]).toMatchObject({ studentId: 's2', studentName: 'Student B', present: 60, absent: 60, conducted: 120, percentage: 50 })
    expect(studentSummary[0].percentage).toBeCloseTo(66.67)
  })
})
