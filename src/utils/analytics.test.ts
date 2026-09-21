import { describe, expect, it } from 'vitest'

import { buildOverallAttendanceSummary, buildSubjectPerformance, type AnalyticsRecord, type SubjectLike } from './analytics'

describe('dashboard and reports analytics', () => {
  it('builds overall attendance from actual conducted minutes', () => {
    const records: AnalyticsRecord[] = [
      { student_id: 's1', date: '2026-09-01', subject_id: 'sub1', start_time: '09:30', end_time: '10:30', duration_minutes: 60, status: 'PRESENT' },
      { student_id: 's1', date: '2026-09-01', subject_id: 'sub2', start_time: '10:30', end_time: '11:30', duration_minutes: 60, status: 'ABSENT' },
      { student_id: 's2', date: '2026-09-01', subject_id: 'sub1', start_time: '09:30', end_time: '10:30', duration_minutes: 60, status: 'PRESENT' },
      { student_id: 's2', date: '2026-09-02', subject_id: 'sub3', start_time: '09:30', end_time: '10:30', duration_minutes: 60, status: 'NOT_CONDUCTED' },
    ]

    const summary = buildOverallAttendanceSummary(records)

    expect(summary.presentMinutes).toBe(120)
    expect(summary.conductedMinutes).toBe(180)
    expect(summary.percentage).toBeCloseTo(66.67)
    expect(summary.warning).toBe(true)
  })

  it('aggregates subject-level performance with names and percentages', () => {
    const records: AnalyticsRecord[] = [
      { student_id: 's1', date: '2026-09-01', subject_id: 'sub1', start_time: '09:30', end_time: '10:30', duration_minutes: 60, status: 'PRESENT' },
      { student_id: 's2', date: '2026-09-01', subject_id: 'sub1', start_time: '09:30', end_time: '10:30', duration_minutes: 60, status: 'ABSENT' },
      { student_id: 's1', date: '2026-09-02', subject_id: 'sub2', start_time: '09:30', end_time: '10:30', duration_minutes: 60, status: 'PRESENT' },
      { student_id: 's2', date: '2026-09-02', subject_id: 'sub2', start_time: '09:30', end_time: '10:30', duration_minutes: 60, status: 'PRESENT' },
      { student_id: 's1', date: '2026-09-03', subject_id: 'sub3', start_time: '09:30', end_time: '10:30', duration_minutes: 60, status: 'NOT_CONDUCTED' },
    ]

    const subjects: SubjectLike[] = [
      { id: 'sub1', name: 'Computer Networks' },
      { id: 'sub2', name: 'Software Engineering' },
      { id: 'sub3', name: 'DBMS' },
    ]

    const summary = buildSubjectPerformance(records, subjects)

    expect(summary).toHaveLength(2)
    expect(summary[0]).toMatchObject({ subjectId: 'sub2', subjectName: 'Software Engineering', percentage: 100 })
    expect(summary[1]).toMatchObject({ subjectId: 'sub1', subjectName: 'Computer Networks', percentage: 50 })
  })
})
