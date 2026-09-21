import type { AcademicDay, TimetableEntry } from '../types/database'

export const DEFAULT_WORKING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
export const LUNCH_START = '12:30'
export const LUNCH_END = '13:30'
export const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

export function parseTimeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return Number.NaN
  }

  return hours * 60 + minutes
}

export function isLunchPeriod(startTime: string, endTime: string): boolean {
  const startMinutes = parseTimeToMinutes(startTime)
  const endMinutes = parseTimeToMinutes(endTime)
  const lunchStartMinutes = parseTimeToMinutes(LUNCH_START)
  const lunchEndMinutes = parseTimeToMinutes(LUNCH_END)

  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes)) {
    return false
  }

  return startMinutes < lunchEndMinutes && endMinutes > lunchStartMinutes
}

export function isTimeRangeValid(startTime: string, endTime: string): boolean {
  const startMinutes = parseTimeToMinutes(startTime)
  const endMinutes = parseTimeToMinutes(endTime)

  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes)) {
    return false
  }

  return endMinutes > startMinutes && !isLunchPeriod(startTime, endTime)
}

export function matchesTimetableDateRange(date: string, activeFrom: string | null, activeUntil: string | null): boolean {
  if (!activeFrom && !activeUntil) {
    return true
  }

  const target = new Date(`${date}T00:00:00`).getTime()

  if (activeFrom) {
    const from = new Date(`${activeFrom}T00:00:00`).getTime()
    if (target < from) {
      return false
    }
  }

  if (activeUntil) {
    const until = new Date(`${activeUntil}T00:00:00`).getTime()
    if (target > until) {
      return false
    }
  }

  return true
}

export function isHolidayDate(date: string, academicDays: Array<Pick<AcademicDay, 'date' | 'day_type'>> = []): boolean {
  return academicDays.some((entry) => entry.date === date && entry.day_type === 'HOLIDAY')
}

export function isWorkingAcademicDate(
  date: string,
  workingDays: readonly string[] = DEFAULT_WORKING_DAYS,
  academicDays: Array<Pick<AcademicDay, 'date' | 'day_type'>> = [],
): boolean {
  if (isHolidayDate(date, academicDays)) {
    return false
  }

  const dateObject = new Date(`${date}T00:00:00`)
  const dayName = dateObject.toLocaleDateString('en-US', { weekday: 'long' })

  return workingDays.includes(dayName)
}

export function getLogicalLabDurationMinutes(subjectName: string, startTime: string, endTime: string): number {
  const startMinutes = parseTimeToMinutes(startTime)
  const endMinutes = parseTimeToMinutes(endTime)

  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || endMinutes <= startMinutes) {
    return 0
  }

  const durationMinutes = endMinutes - startMinutes

  if (/lab/i.test(subjectName)) {
    return durationMinutes
  }

  return durationMinutes
}

export function validateTimetableEntry(input: Partial<TimetableEntry>): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!input.group_id || input.group_id.trim().length === 0) {
    errors.push('A group is required.')
  }

  if (!input.subject_id || input.subject_id.trim().length === 0) {
    errors.push('A subject is required.')
  }

  if (typeof input.day_of_week !== 'number' || input.day_of_week < 0 || input.day_of_week > 6) {
    errors.push('Day of week must be between Sunday (0) and Saturday (6).')
  }

  if (!input.start_time || !input.end_time) {
    errors.push('Start and end time are required.')
  } else if (!isTimeRangeValid(input.start_time, input.end_time)) {
    errors.push('The schedule must not be zero-length, must end after it starts, and must exclude the lunch break.')
  }

  if (input.active_from && input.active_until && input.active_from > input.active_until) {
    errors.push('The active date range is invalid. Active until must be on or after active from.')
  }

  return { valid: errors.length === 0, errors }
}

export function resolveScheduledClassesForDate(
  date: string,
  timetableEntries: TimetableEntry[],
  workingDays: readonly string[] = DEFAULT_WORKING_DAYS,
  academicDays: Array<Pick<AcademicDay, 'date' | 'day_type'>> = [],
): TimetableEntry[] {
  if (!isWorkingAcademicDate(date, workingDays, academicDays)) {
    return []
  }

  const dayOfWeek = new Date(`${date}T12:00:00`).getDay()

  return timetableEntries.filter((entry) => {
    if (entry.day_of_week !== dayOfWeek) {
      return false
    }

    return matchesTimetableDateRange(date, entry.active_from ?? null, entry.active_until ?? null)
  })
}
