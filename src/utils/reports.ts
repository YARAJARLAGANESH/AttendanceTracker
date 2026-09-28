import { ATTENDANCE_THRESHOLD, calculateAttendance } from './attendance'
import type { AttendanceRecord, Student, Subject } from '../types/database'

export type OverallReportSummary = {
  present: number
  absent: number
  conducted: number
  percentage: number | null
  warning: boolean
}

export type SubjectReportRow = {
  subjectId: string
  subjectName: string
  present: number
  absent: number
  conducted: number
  percentage: number | null
  warning: boolean
}

export type StudentReportRow = {
  studentId: string
  studentName: string
  present: number
  absent: number
  conducted: number
  percentage: number | null
  warning: boolean
}

export type WeeklyReportRow = {
  startDate: string
  endDate: string
  present: number
  absent: number
  conducted: number
  percentage: number | null
  warning: boolean
}

export type MonthlyReportRow = {
  month: string
  present: number
  absent: number
  conducted: number
  percentage: number | null
  warning: boolean
}

export type LowAttendanceItem = {
  type: 'subject' | 'student'
  identifier: string
  percentage: number | null
  value: number
}

const sortByDate = (a: AttendanceRecord, b: AttendanceRecord) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time)

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function filterAttendanceRecordsByRange(records: AttendanceRecord[], startDate: string, endDate: string): AttendanceRecord[] {
  if (!startDate && !endDate) return [...records]

  const start = startDate ? new Date(`${startDate}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY
  const end = endDate ? new Date(`${endDate}T23:59:59`).getTime() : Number.POSITIVE_INFINITY

  return records.filter((record) => {
    const recordTime = new Date(`${record.date}T00:00:00`).getTime()
    return recordTime >= start && recordTime <= end
  })
}

export function buildOverallReportSummary(records: AttendanceRecord[]): OverallReportSummary {
  const totals = records.reduce(
    (acc, record) => {
      if (record.status === 'PRESENT') {
        acc.present += record.duration_minutes
        acc.conducted += record.duration_minutes
      }

      if (record.status === 'ABSENT') {
        acc.absent += record.duration_minutes
        acc.conducted += record.duration_minutes
      }

      return acc
    },
    { present: 0, absent: 0, conducted: 0 },
  )

  const summary = calculateAttendance(totals.present, totals.conducted)

  return {
    present: totals.present,
    absent: totals.absent,
    conducted: totals.conducted,
    percentage: summary.percentage,
    warning: summary.warning,
  }
}

export function buildSubjectAttendance(records: AttendanceRecord[], subjects: Subject[]): SubjectReportRow[] {
  const subjectMap = new Map(subjects.map((subject) => [subject.id, subject.name]))
  const grouped = new Map<string, { present: number; absent: number; conducted: number }>()

  for (const record of records) {
    if (record.status === 'NOT_CONDUCTED') continue

    const current = grouped.get(record.subject_id) ?? { present: 0, absent: 0, conducted: 0 }

    if (record.status === 'PRESENT') {
      current.present += record.duration_minutes
    }

    if (record.status === 'ABSENT') {
      current.absent += record.duration_minutes
    }

    current.conducted += record.duration_minutes
    grouped.set(record.subject_id, current)
  }

  return Array.from(grouped.entries())
    .map(([subjectId, totals]) => {
      const summary = calculateAttendance(totals.present, totals.conducted)
      return {
        subjectId,
        subjectName: subjectMap.get(subjectId) ?? 'Unknown subject',
        present: totals.present,
        absent: totals.absent,
        conducted: totals.conducted,
        percentage: summary.percentage,
        warning: summary.warning,
      }
    })
    .sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0))
}

export function buildStudentAttendance(records: AttendanceRecord[], students: Student[]): StudentReportRow[] {
  const studentMap = new Map(students.map((student) => [student.id, student.name]))
  const grouped = new Map<string, { present: number; absent: number; conducted: number }>()

  for (const record of records) {
    if (record.status === 'NOT_CONDUCTED') continue

    const current = grouped.get(record.student_id) ?? { present: 0, absent: 0, conducted: 0 }

    if (record.status === 'PRESENT') {
      current.present += record.duration_minutes
    }

    if (record.status === 'ABSENT') {
      current.absent += record.duration_minutes
    }

    current.conducted += record.duration_minutes
    grouped.set(record.student_id, current)
  }

  return Array.from(grouped.entries())
    .map(([studentId, totals]) => {
      const summary = calculateAttendance(totals.present, totals.conducted)
      return {
        studentId,
        studentName: studentMap.get(studentId) ?? 'Unknown student',
        present: totals.present,
        absent: totals.absent,
        conducted: totals.conducted,
        percentage: summary.percentage,
        warning: summary.warning,
      }
    })
    .sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0))
}

export function buildWeeklyAttendance(records: AttendanceRecord[]): WeeklyReportRow[] {
  const byWeek = new Map<string, AttendanceRecord[]>()

  for (const record of [...records].sort(sortByDate)) {
    const date = new Date(`${record.date}T00:00:00`)
    const day = date.getDay()
    const mondayOffset = (day + 6) % 7
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - mondayOffset)
    const key = formatDateKey(weekStart)
    const list = byWeek.get(key) ?? []
    list.push(record)
    byWeek.set(key, list)
  }

  return Array.from(byWeek.entries())
    .map(([startDate, entries]) => {
      const weekEnd = new Date(`${startDate}T00:00:00`)
      weekEnd.setDate(weekEnd.getDate() + 6)
      const totals = entries.reduce(
        (acc, record) => {
          if (record.status === 'PRESENT') {
            acc.present += record.duration_minutes
            acc.conducted += record.duration_minutes
          }

          if (record.status === 'ABSENT') {
            acc.absent += record.duration_minutes
            acc.conducted += record.duration_minutes
          }

          return acc
        },
        { present: 0, absent: 0, conducted: 0 },
      )

      const summary = calculateAttendance(totals.present, totals.conducted)
      return {
        startDate,
        endDate: formatDateKey(weekEnd),
        present: totals.present,
        absent: totals.absent,
        conducted: totals.conducted,
        percentage: summary.percentage,
        warning: summary.warning,
      }
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
}

export function buildMonthlyAttendance(records: AttendanceRecord[]): MonthlyReportRow[] {
  const byMonth = new Map<string, AttendanceRecord[]>()

  for (const record of [...records].sort(sortByDate)) {
    const monthKey = record.date.slice(0, 7)
    const list = byMonth.get(monthKey) ?? []
    list.push(record)
    byMonth.set(monthKey, list)
  }

  return Array.from(byMonth.entries())
    .map(([month, entries]) => {
      const totals = entries.reduce(
        (acc, record) => {
          if (record.status === 'PRESENT') {
            acc.present += record.duration_minutes
            acc.conducted += record.duration_minutes
          }

          if (record.status === 'ABSENT') {
            acc.absent += record.duration_minutes
            acc.conducted += record.duration_minutes
          }

          return acc
        },
        { present: 0, absent: 0, conducted: 0 },
      )

      const summary = calculateAttendance(totals.present, totals.conducted)
      return {
        month,
        present: totals.present,
        absent: totals.absent,
        conducted: totals.conducted,
        percentage: summary.percentage,
        warning: summary.warning,
      }
    })
    .sort((a, b) => a.month.localeCompare(b.month))
}

export function buildLowAttendanceItems(rows: Array<SubjectReportRow | StudentReportRow>): LowAttendanceItem[] {
  return rows
    .filter((row) => row.percentage !== null && row.percentage < ATTENDANCE_THRESHOLD)
    .map((row): LowAttendanceItem => ({
      type: 'subjectName' in row ? 'subject' : 'student',
      identifier: 'subjectName' in row ? row.subjectName : row.studentName,
      percentage: row.percentage,
      value: row.conducted,
    }))
    .sort((a, b) => (a.percentage ?? 0) - (b.percentage ?? 0))
}
