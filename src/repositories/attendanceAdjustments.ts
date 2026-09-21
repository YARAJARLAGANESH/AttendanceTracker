import { supabase } from '../lib/supabase'
import type { AttendanceAdjustment, AttendanceStatus } from '../types/database'
import { assertValidAttendanceStatus } from './validation'

export type ManualAdjustmentValidationResult = {
  valid: boolean
  normalizedReason: string
  errors: string[]
}

export function normalizeAdjustmentReason(value: string): string {
  return value.trim()
}

export function validateManualAttendanceAdjustment(
  currentStatus: string,
  nextStatus: string,
  reason: string,
): ManualAdjustmentValidationResult {
  const errors: string[] = []
  const normalizedReason = normalizeAdjustmentReason(reason)

  if (!normalizedReason) {
    errors.push('A reason is required for every manual attendance adjustment.')
  }

  if (normalizedReason.length > 500) {
    errors.push('The adjustment reason is too long. It must be 500 characters or fewer.')
  }

  if (!currentStatus || !nextStatus) {
    errors.push('A valid attendance status is required for the adjustment.')
  }

  if (currentStatus && nextStatus && currentStatus === nextStatus) {
    errors.push('A manual adjustment requires a different attendance status.')
  }

  if (nextStatus) {
    try {
      assertValidAttendanceStatus(nextStatus)
    } catch {
      errors.push(`Unsupported attendance status: ${nextStatus}`)
    }
  }

  return {
    valid: errors.length === 0,
    normalizedReason,
    errors,
  }
}

export type AttendanceAdjustmentListItem = AttendanceAdjustment & {
  attendance_date: string | null
  student_name: string | null
  subject_name: string | null
  subject_id: string | null
  student_id: string
}

export async function adjustAttendanceRecord(input: {
  attendanceId: string
  newStatus: AttendanceStatus
  reason: string
  expectedPreviousStatus?: AttendanceStatus
}) {
  const validation = validateManualAttendanceAdjustment(
    input.expectedPreviousStatus ?? '',
    input.newStatus,
    input.reason,
  )

  if (!validation.valid) {
    throw new Error(validation.errors.join(' '))
  }

  const { data, error } = await supabase.rpc('adjust_attendance_record', {
    p_attendance_id: input.attendanceId,
    p_new_status: input.newStatus,
    p_reason: validation.normalizedReason,
    p_expected_previous_status: input.expectedPreviousStatus ?? null,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data as { id: string; status: AttendanceStatus }
}

export async function listAttendanceAdjustmentsForGroup(groupId: string, filters?: {
  studentId?: string
  subjectId?: string
  adjustedBy?: string
  startDate?: string
  endDate?: string
  status?: AttendanceStatus
}) {
  let query = supabase.from('attendance_adjustments').select('*').eq('group_id', groupId)

  if (filters?.studentId) {
    query = query.eq('student_id', filters.studentId)
  }

  if (filters?.subjectId) {
    query = query.eq('subject_id', filters.subjectId)
  }

  if (filters?.adjustedBy) {
    query = query.eq('adjusted_by', filters.adjustedBy)
  }

  if (filters?.startDate) {
    query = query.gte('adjusted_at', `${filters.startDate}T00:00:00.000Z`)
  }

  if (filters?.endDate) {
    query = query.lte('adjusted_at', `${filters.endDate}T23:59:59.999Z`)
  }

  if (filters?.status) {
    query = query.or(`new_status.eq.${filters.status},previous_status.eq.${filters.status}`)
  }

  const { data, error } = await query.order('adjusted_at', { ascending: false })
  if (error) throw error

  const rows = (data ?? []) as AttendanceAdjustment[]

  if (rows.length === 0) {
    return [] as AttendanceAdjustmentListItem[]
  }

  const studentIds = [...new Set(rows.map((row) => row.student_id))]
  const subjectIds = [...new Set(rows.map((row) => row.subject_id))]

  const [studentRows, subjectRows] = await Promise.all([
    studentIds.length > 0 ? supabase.from('students').select('id, name').in('id', studentIds) : Promise.resolve({ data: [] as Array<{ id: string; name: string }>, error: null }),
    subjectIds.length > 0 ? supabase.from('subjects').select('id, name').in('id', subjectIds) : Promise.resolve({ data: [] as Array<{ id: string; name: string }>, error: null }),
  ])

  if (studentRows.error) throw studentRows.error
  if (subjectRows.error) throw subjectRows.error

  const studentMap = new Map((studentRows.data ?? []).map((row) => [row.id, row.name]))
  const subjectMap = new Map((subjectRows.data ?? []).map((row) => [row.id, row.name]))

  return rows.map((row) => ({
    ...row,
    attendance_date: row.attendance_date,
    student_name: studentMap.get(row.student_id) ?? null,
    subject_name: subjectMap.get(row.subject_id) ?? null,
  }))
}

export async function getAttendanceAdjustmentDetail(attendanceAdjustmentId: string) {
  const { data, error } = await supabase.from('attendance_adjustments').select('*').eq('id', attendanceAdjustmentId).maybeSingle()
  if (error) throw error
  if (!data) {
    return null
  }

  const attendanceRef = await supabase.from('attendance').select('id, date, student_id, subject_id').eq('id', data.attendance_id).maybeSingle()
  if (attendanceRef.error) throw attendanceRef.error

  const [studentRow, subjectRow, profileRow] = await Promise.all([
    attendanceRef.data ? supabase.from('students').select('id, name').eq('id', attendanceRef.data.student_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    attendanceRef.data ? supabase.from('subjects').select('id, name').eq('id', attendanceRef.data.subject_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    data.adjusted_by ? supabase.from('profiles').select('id, display_name, email').eq('id', data.adjusted_by).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ])

  if (studentRow.error) throw studentRow.error
  if (subjectRow.error) throw subjectRow.error
  if (profileRow.error) throw profileRow.error

  return {
    ...data,
    attendance_date: attendanceRef.data?.date ?? null,
    student_name: studentRow.data?.name ?? null,
    subject_name: subjectRow.data?.name ?? null,
    adjusted_by_name: profileRow.data?.display_name ?? profileRow.data?.email ?? null,
  }
}
