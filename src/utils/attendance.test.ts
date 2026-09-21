import { describe, expect, it } from 'vitest'

import { calculateAttendance, summarizeAttendanceRecords, isWarningAttendance } from './attendance'

describe('attendance calculation engine', () => {
  it('calculates a normal percentage', () => {
    expect(calculateAttendance(8, 10).percentage).toBeCloseTo(80)
  })

  it('excludes holidays from conducted classes', () => {
    const summary = summarizeAttendanceRecords([
      { student_id: 's1', date: '2026-09-21', subject_id: 'sub1', start_time: '09:30', end_time: '10:30', duration_minutes: 60, status: 'PRESENT' },
      { student_id: 's1', date: '2026-09-21', subject_id: 'sub2', start_time: '10:30', end_time: '11:30', duration_minutes: 60, status: 'ABSENT' },
    ])

    expect(summary.conductedMinutes).toBe(120)
    expect(summary.percentage).toBe(50)
  })

  it('excludes not-conducted classes', () => {
    const summary = summarizeAttendanceRecords([
      { student_id: 's1', date: '2026-09-21', subject_id: 'sub1', start_time: '09:30', end_time: '10:30', duration_minutes: 60, status: 'PRESENT' },
      { student_id: 's1', date: '2026-09-21', subject_id: 'sub2', start_time: '10:30', end_time: '11:30', duration_minutes: 60, status: 'NOT_CONDUCTED' },
    ])

    expect(summary.conductedMinutes).toBe(60)
    expect(summary.percentage).toBe(100)
  })

  it('counts a 3-hour lab as 180 minutes', () => {
    const summary = summarizeAttendanceRecords([
      { student_id: 's1', date: '2026-09-21', subject_id: 'lab', start_time: '13:30', end_time: '16:30', duration_minutes: 180, status: 'PRESENT' },
      { student_id: 's1', date: '2026-09-21', subject_id: 'lab2', start_time: '13:30', end_time: '16:30', duration_minutes: 180, status: 'ABSENT' },
    ])

    expect(summary.presentMinutes).toBe(180)
    expect(summary.conductedMinutes).toBe(360)
    expect(calculateAttendance(180, 360).percentage).toBeCloseTo(50)
  })

  it('treats exactly 75% as non-warning', () => {
    expect(isWarningAttendance(calculateAttendance(75, 100).percentage)).toBe(false)
  })

  it('warns below 75%', () => {
    expect(isWarningAttendance(calculateAttendance(74.99, 100).percentage)).toBe(true)
  })

  it('does not warn above 75%', () => {
    expect(isWarningAttendance(calculateAttendance(75.01, 100).percentage)).toBe(false)
  })

  it('returns N/A when no classes were conducted', () => {
    expect(calculateAttendance(0, 0).percentage).toBeNull()
  })

  it('uses actual conducted minutes for monthly totals', () => {
    const monthly = summarizeAttendanceRecords([
      { student_id: 's1', date: '2026-09-01', subject_id: 'a', start_time: '09:30', end_time: '10:30', duration_minutes: 90, status: 'PRESENT' },
      { student_id: 's1', date: '2026-09-02', subject_id: 'b', start_time: '09:30', end_time: '10:30', duration_minutes: 90, status: 'ABSENT' },
      { student_id: 's1', date: '2026-09-03', subject_id: 'c', start_time: '09:30', end_time: '10:30', duration_minutes: 90, status: 'PRESENT' },
      { student_id: 's1', date: '2026-09-04', subject_id: 'd', start_time: '09:30', end_time: '10:30', duration_minutes: 90, status: 'NOT_CONDUCTED' },
    ])

    expect(monthly.presentMinutes).toBe(180)
    expect(monthly.conductedMinutes).toBe(270)
    expect(monthly.percentage).toBeCloseTo(66.67)
  })

  it('weights overall attendance by total conducted minutes', () => {
    const summary = summarizeAttendanceRecords([
      { student_id: 's1', date: '2026-09-01', subject_id: 'a', start_time: '09:30', end_time: '10:30', duration_minutes: 60, status: 'PRESENT' },
      { student_id: 's1', date: '2026-09-01', subject_id: 'b', start_time: '10:30', end_time: '11:30', duration_minutes: 60, status: 'ABSENT' },
      { student_id: 's1', date: '2026-09-02', subject_id: 'c', start_time: '09:30', end_time: '10:30', duration_minutes: 60, status: 'PRESENT' },
      { student_id: 's1', date: '2026-09-02', subject_id: 'd', start_time: '10:30', end_time: '11:30', duration_minutes: 60, status: 'PRESENT' },
    ])

    expect(summary.presentMinutes).toBe(180)
    expect(summary.conductedMinutes).toBe(240)
    expect(summary.percentage).toBeCloseTo(75)
  })
})
