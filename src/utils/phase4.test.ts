import { describe, expect, it } from 'vitest'
import {
  DEFAULT_WORKING_DAYS,
  getLogicalLabDurationMinutes,
  isHolidayDate,
  isLunchPeriod,
  isTimeRangeValid,
  isWorkingAcademicDate,
  matchesTimetableDateRange,
  validateTimetableEntry,
} from './schedule'

describe('phase 4 academic calendar and timetable logic', () => {
  it('treats Monday to Saturday as working days and Sunday as non-working', () => {
    expect(isWorkingAcademicDate('2026-09-21', DEFAULT_WORKING_DAYS)).toBe(true)
    expect(isWorkingAcademicDate('2026-09-20', DEFAULT_WORKING_DAYS)).toBe(false)
    expect(isWorkingAcademicDate('2026-09-19', DEFAULT_WORKING_DAYS)).toBe(true)
  })

  it('excludes holidays from working-day checks', () => {
    const academicDays: Array<{ date: string; day_type: 'HOLIDAY' | 'NORMAL' }> = [{ date: '2026-09-21', day_type: 'HOLIDAY' }]
    expect(isWorkingAcademicDate('2026-09-21', DEFAULT_WORKING_DAYS, academicDays)).toBe(false)
    expect(isHolidayDate('2026-09-21', academicDays)).toBe(true)
  })

  it('matches timetable date range using active_from and active_until', () => {
    expect(matchesTimetableDateRange('2026-09-21', '2026-09-01', '2026-10-31')).toBe(true)
    expect(matchesTimetableDateRange('2026-11-01', '2026-09-01', '2026-10-31')).toBe(false)
    expect(matchesTimetableDateRange('2026-09-15', '2026-09-15', '2026-09-30')).toBe(true)
  })

  it('validates time ranges and rejects end earlier than start', () => {
    expect(isTimeRangeValid('09:00', '11:00')).toBe(true)
    expect(isTimeRangeValid('11:00', '09:00')).toBe(false)
    expect(isTimeRangeValid('12:30', '13:30')).toBe(false)
  })

  it('excludes the documented lunch period from instructional time', () => {
    expect(isLunchPeriod('12:30', '13:30')).toBe(true)
    expect(isLunchPeriod('13:00', '13:30')).toBe(true)
    expect(isLunchPeriod('09:00', '10:00')).toBe(false)
  })

  it('keeps a 3-hour lab as one logical class', () => {
    expect(getLogicalLabDurationMinutes('ML Lab', '13:30', '16:30')).toBe(180)
    expect(getLogicalLabDurationMinutes('DBMS Lab', '13:30', '16:30')).toBe(180)
  })

  it('identifies a scheduled class and ignores lunch blocks', () => {
    expect(validateTimetableEntry({
      day_of_week: 1,
      subject_id: 'subject-1',
      start_time: '09:00',
      end_time: '10:00',
      active_from: '2026-09-01',
      active_until: '2026-12-31',
      group_id: 'group-1',
    }).valid).toBe(true)

    expect(validateTimetableEntry({
      day_of_week: 1,
      subject_id: 'subject-1',
      start_time: '12:30',
      end_time: '13:30',
      active_from: '2026-09-01',
      active_until: '2026-12-31',
      group_id: 'group-1',
    }).valid).toBe(false)
  })

  it('rejects invalid timetable data', () => {
    const result = validateTimetableEntry({
      day_of_week: 8,
      subject_id: '',
      start_time: '11:00',
      end_time: '09:00',
      active_from: '2026-10-31',
      active_until: '2026-10-01',
      group_id: '',
    })

    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})
