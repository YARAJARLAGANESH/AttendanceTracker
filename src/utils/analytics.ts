import { calculateAttendance } from './attendance'

export type AnalyticsRecord = {
  student_id: string
  date: string
  subject_id: string
  start_time: string
  end_time: string
  duration_minutes: number
  status: 'PRESENT' | 'ABSENT' | 'NOT_CONDUCTED'
}

export type SubjectLike = {
  id: string
  name: string
}

export type OverallAttendanceSummary = {
  presentMinutes: number
  conductedMinutes: number
  percentage: number | null
  warning: boolean
}

export type SubjectPerformance = {
  subjectId: string
  subjectName: string
  presentMinutes: number
  conductedMinutes: number
  percentage: number | null
  warning: boolean
}

export function buildOverallAttendanceSummary(records: AnalyticsRecord[]): OverallAttendanceSummary {
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

  return {
    ...calculateAttendance(totals.presentMinutes, totals.conductedMinutes),
  }
}

export function buildSubjectPerformance(records: AnalyticsRecord[], subjects: SubjectLike[]): SubjectPerformance[] {
  const subjectMap = new Map(subjects.map((subject) => [subject.id, subject.name]))

  const grouped = new Map<string, { presentMinutes: number; conductedMinutes: number }>()

  for (const record of records) {
    if (record.status === 'NOT_CONDUCTED') continue

    const key = record.subject_id
    const current = grouped.get(key) ?? { presentMinutes: 0, conductedMinutes: 0 }

    if (record.status === 'PRESENT') {
      current.presentMinutes += record.duration_minutes
    }

    current.conductedMinutes += record.duration_minutes
    grouped.set(key, current)
  }

  return Array.from(grouped.entries())
    .map(([subjectId, totals]) => {
      const summary = calculateAttendance(totals.presentMinutes, totals.conductedMinutes)
      return {
        subjectId,
        subjectName: subjectMap.get(subjectId) ?? 'Unknown subject',
        presentMinutes: summary.presentMinutes,
        conductedMinutes: summary.conductedMinutes,
        percentage: summary.percentage,
        warning: summary.warning,
      }
    })
    .sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0))
}
