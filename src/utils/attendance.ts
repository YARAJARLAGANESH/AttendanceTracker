import type { AttendanceStatus, AttendanceSummary, AttendanceRecord } from '../types/attendance'

export const ATTENDANCE_THRESHOLD = 75

const clampPercentage = (value: number): number => {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}

export const isWarningAttendance = (percentage: number | null): boolean => {
  if (percentage === null || Number.isNaN(percentage)) return true
  return percentage < ATTENDANCE_THRESHOLD
}

export const calculateAttendance = (
  presentMinutes: number,
  conductedMinutes: number,
): AttendanceSummary => {
  const safeConducted = Math.max(0, conductedMinutes)
  const safePresent = Math.max(0, presentMinutes)

  if (safeConducted === 0) {
    return {
      presentMinutes: safePresent,
      conductedMinutes: safeConducted,
      percentage: null,
      warning: true,
    }
  }

  const percentage = clampPercentage((safePresent / safeConducted) * 100)

  return {
    presentMinutes: safePresent,
    conductedMinutes: safeConducted,
    percentage,
    warning: percentage < ATTENDANCE_THRESHOLD,
  }
}

export const summarizeAttendanceRecords = (
  records: AttendanceRecord[],
): AttendanceSummary => {
  const totals = records.reduce(
    (acc, record) => {
      if (record.status === 'PRESENT') {
        acc.presentMinutes += record.duration_minutes
        acc.conductedMinutes += record.duration_minutes
      }

      if (record.status === 'ABSENT') {
        acc.conductedMinutes += record.duration_minutes
      }

      return acc
    },
    { presentMinutes: 0, conductedMinutes: 0 },
  )

  return calculateAttendance(totals.presentMinutes, totals.conductedMinutes)
}

export const getAttendanceStatusLabel = (status: AttendanceStatus | null): string => {
  switch (status) {
    case 'PRESENT':
      return 'Present'
    case 'ABSENT':
      return 'Absent'
    case 'NOT_CONDUCTED':
      return 'Not Conducted'
    default:
      return 'Unmarked'
  }
}
