import { supabase } from '../lib/supabase'
import type { AttendanceRecord } from '../types/database'
import { assertValidAttendanceStatus } from './validation'

export async function listAttendanceForStudent(
  studentId: string,
) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('student_id', studentId)
    .order('date', { ascending: false })
    .order('start_time', { ascending: false })

  if (error) throw error

  return (data ?? []) as AttendanceRecord[]
}

export async function listAttendanceForDateAndGroup(
  groupId: string,
  date: string,
) {
  const { data: students, error: studentsError } =
    await supabase
      .from('students')
      .select('id')
      .eq('group_id', groupId)

  if (studentsError) throw studentsError

  const studentIds = (students ?? []).map(
    (student) => student.id,
  )

  if (studentIds.length === 0) {
    return [] as AttendanceRecord[]
  }

  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('date', date)
    .in('student_id', studentIds)
    .order('start_time', { ascending: true })

  if (error) throw error

  return (data ?? []) as AttendanceRecord[]
}

export async function listAttendanceForGroup(
  groupId: string,
) {
  const { data: students, error: studentsError } =
    await supabase
      .from('students')
      .select('id')
      .eq('group_id', groupId)

  if (studentsError) throw studentsError

  const studentIds = (students ?? []).map(
    (student) => student.id,
  )

  if (studentIds.length === 0) {
    return [] as AttendanceRecord[]
  }

  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .in('student_id', studentIds)
    .order('date', { ascending: false })
    .order('start_time', { ascending: false })

  if (error) throw error

  return (data ?? []) as AttendanceRecord[]
}

export async function upsertAttendanceRecord(input: {
  student_id: string
  date: string
  subject_id: string
  class_group_id?: string | null
  start_time: string
  end_time: string
  duration_minutes: number
  status: AttendanceRecord['status']
  updated_by?: string | null
  reason?: string | null
}) {
  assertValidAttendanceStatus(input.status)

  const payload = {
    student_id: input.student_id,
    date: input.date,
    subject_id: input.subject_id,
    class_group_id: input.class_group_id ?? null,
    start_time: input.start_time,
    end_time: input.end_time,
    duration_minutes: Number(input.duration_minutes),
    status: input.status,
    updated_by: input.updated_by ?? null,
    reason: input.reason ?? null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('attendance')
    .upsert(payload, {
      onConflict:
        'student_id,date,subject_id,start_time,end_time',
    })
    .select('*')
    .single()

  if (error) throw error

  return data as AttendanceRecord
}

export async function updateAttendanceStatus(
  attendanceId: string,
  status: AttendanceRecord['status'],
  reason?: string,
) {
  assertValidAttendanceStatus(status)

  const { data, error } = await supabase
    .from('attendance')
    .update({
      status,
      reason: reason ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', attendanceId)
    .select('*')
    .single()

  if (error) throw error

  return data as AttendanceRecord
}
