import type { AttendanceRecord, Subject } from '../types/database'

export type RecentAttendanceItem = {
  date: string
  subjectId: string
  subjectName: string
  start_time: string
  end_time: string
  duration_minutes: number
  status: AttendanceRecord['status']
}

export function buildRecentAttendance(
  records: AttendanceRecord[],
  subjects: Subject[],
  limit = 5,
): RecentAttendanceItem[] {
  const subjectMap = new Map(
    subjects.map((subject) => [subject.id, subject.name]),
  )

  /*
   * Remove duplicate attendance rows for the same class period.
   *
   * A class period is identified by:
   * date + subject + start time + end time
   *
   * This prevents duplicate-looking entries from appearing
   * in the Recent Attendance section.
   */
  const uniqueRecords = new Map<string, AttendanceRecord>()

  for (const record of records) {
    const key = [
      record.date,
      record.subject_id,
      record.start_time,
      record.end_time,
    ].join('|')

    /*
     * Keep the first record for each class period.
     *
     * Since the attendance page already filters the records
     * before calling this function, this is only a display-level
     * duplicate protection.
     */
    if (!uniqueRecords.has(key)) {
      uniqueRecords.set(key, record)
    }
  }

  return [...uniqueRecords.values()]
    .sort((a, b) => {
      const dateComparison =
        new Date(`${b.date}T00:00:00`).getTime() -
        new Date(`${a.date}T00:00:00`).getTime()

      if (dateComparison !== 0) {
        return dateComparison
      }

      return b.start_time.localeCompare(a.start_time)
    })
    .slice(0, limit)
    .map((record) => ({
      date: record.date,
      subjectId: record.subject_id,
      subjectName:
        subjectMap.get(record.subject_id) ?? 'Unknown subject',
      start_time: record.start_time,
      end_time: record.end_time,
      duration_minutes: record.duration_minutes,
      status: record.status,
    }))
}
