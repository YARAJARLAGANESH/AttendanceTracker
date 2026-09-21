import { supabase } from '../lib/supabase'
import type { AttendanceRecord } from '../types/database'
import { assertValidAttendanceStatus } from './validation'

export async function listAttendanceForStudent(studentId: string) {
  const { data, error } = await supabase.from('attendance').select('*').eq('student_id', studentId)
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

  const { data, error } = await supabase
    .from('attendance')
    .upsert(
      {
        ...input,
        duration_minutes: Number(input.duration_minutes),
      },
      {
        onConflict: 'student_id,date,subject_id,start_time,end_time',
      },
    )
    .select('*')
    .single()

  if (error) throw error
  return data as AttendanceRecord
}

export async function updateAttendanceStatus(attendanceId: string, status: AttendanceRecord['status'], reason?: string) {
  assertValidAttendanceStatus(status)

  const { data, error } = await supabase
    .from('attendance')
    .update({ status, reason, updated_at: new Date().toISOString() })
    .eq('id', attendanceId)
    .select('*')
    .single()

  if (error) throw error
  return data as AttendanceRecord
}
