import { describe, expect, it } from 'vitest'
import {
  DEFAULT_WORKING_DAYS,
  isHolidayDate,
  isWorkingAcademicDate,
  matchesTimetableDateRange,
  resolveScheduledClassesForDate,
} from './schedule'

describe('phase 5 attendance workflow logic', () => {
  it('returns no classes on a holiday or Sunday', () => {
    const entries = [
      {
        id: '1',
        group_id: 'g1',
        day_of_week: 1,
        subject_id: 'sub1',
        start_time: '09:00',
        end_time: '10:00',
        class_group_id: null,
        active_from: '2026-09-01',
        active_until: '2026-12-31',
      },
    ]

    expect(isWorkingAcademicDate('2026-09-20', DEFAULT_WORKING_DAYS)).toBe(false)
    expect(resolveScheduledClassesForDate('2026-09-20', entries, DEFAULT_WORKING_DAYS)).toHaveLength(0)

    const holidayEntries = [{ date: '2026-09-21', day_type: 'HOLIDAY' as const }]
    expect(isHolidayDate('2026-09-21', holidayEntries)).toBe(true)
    expect(isWorkingAcademicDate('2026-09-21', DEFAULT_WORKING_DAYS, holidayEntries)).toBe(false)
  })

  it('applies timetable active ranges and ignores out-of-range entries', () => {
    const entries = [
      {
        id: '1',
        group_id: 'g1',
        day_of_week: 1,
        subject_id: 'sub1',
        start_time: '09:00',
        end_time: '10:00',
        class_group_id: null,
        active_from: '2026-09-01',
        active_until: '2026-09-30',
      },
      {
        id: '2',
        group_id: 'g1',
        day_of_week: 1,
        subject_id: 'sub2',
        start_time: '10:00',
        end_time: '11:00',
        class_group_id: null,
        active_from: '2026-10-01',
        active_until: '2026-10-31',
      },
    ]

    expect(resolveScheduledClassesForDate('2026-09-21', entries, DEFAULT_WORKING_DAYS)).toHaveLength(1)
    expect(matchesTimetableDateRange('2026-09-21', '2026-09-01', '2026-09-30')).toBe(true)
    expect(matchesTimetableDateRange('2026-10-15', '2026-09-01', '2026-09-30')).toBe(false)
  })

  it('keeps labs as a single logical session for the scheduled date', () => {
    const entries = [
      {
        id: 'lab-1',
        group_id: 'g1',
        day_of_week: 1,
        subject_id: 'sub-lab',
        start_time: '13:30',
        end_time: '16:30',
        class_group_id: null,
        active_from: '2026-09-01',
        active_until: '2026-12-31',
      },
    ]

    const resolved = resolveScheduledClassesForDate('2026-09-21', entries, DEFAULT_WORKING_DAYS)
    expect(resolved).toHaveLength(1)
    expect(resolved[0]?.start_time).toBe('13:30')
    expect(resolved[0]?.end_time).toBe('16:30')
  })
})
