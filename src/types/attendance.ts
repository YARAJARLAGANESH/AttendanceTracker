export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'NOT_CONDUCTED'

export type AttendanceSummary = {
  presentMinutes: number
  conductedMinutes: number
  percentage: number | null
  warning: boolean
}

export type AttendanceRecord = {
  id?: string
  student_id: string
  date: string
  subject_id: string
  class_group_id?: string | null
  start_time: string
  end_time: string
  duration_minutes: number
  status: AttendanceStatus
  created_at?: string
  updated_at?: string
}

export type DailySlot = {
  id: string
  subjectId: string
  subjectName: string
  startTime: string
  endTime: string
  durationMinutes: number
  status: AttendanceStatus | null
  classGroupId?: string | null
  isLunch?: boolean
}
