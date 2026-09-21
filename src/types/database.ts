export type UserRole = 'owner' | 'admin' | 'member'
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'NOT_CONDUCTED'
export type AcademicDayType = 'NORMAL' | 'HOLIDAY' | 'SPECIAL_CLASS' | 'EXAM' | 'COLLEGE_EVENT'

export type Profile = {
  id: string
  email: string
  display_name: string | null
  created_at: string
}

export type Group = {
  id: string
  name: string
  college_name: string
  class_name: string
  academic_year: string
  created_by: string
  created_at: string
}

export type GroupMember = {
  id: string
  group_id: string
  user_id: string
  role: UserRole
  joined_at: string
}

export type Student = {
  id: string
  group_id: string
  user_id: string | null
  name: string
  roll_number: string | null
  created_at: string
}

export type Subject = {
  id: string
  group_id: string
  name: string
  short_name: string | null
  is_active: boolean
  created_at: string
}

export type TimetableEntry = {
  id: string
  group_id: string
  day_of_week: number
  subject_id: string
  start_time: string
  end_time: string
  class_group_id: string | null
  active_from: string | null
  active_until: string | null
}

export type AcademicDay = {
  id: string
  group_id: string
  date: string
  day_type: AcademicDayType
  title: string | null
  description: string | null
}

export type AttendanceRecord = {
  id: string
  student_id: string
  date: string
  subject_id: string
  class_group_id: string | null
  start_time: string
  end_time: string
  duration_minutes: number
  status: AttendanceStatus
  created_at: string
  updated_at: string
  updated_by: string | null
  reason: string | null
}
