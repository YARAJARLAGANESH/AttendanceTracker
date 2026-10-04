import { supabase } from '../lib/supabase'
import type {
  AcademicDay,
  AttendanceRecord,
  Group,
  Student,
  Subject,
  TimetableEntry,
  UserRole,
} from '../types/database'

export const BACKUP_VERSION = '1.0'
export const BACKUP_APPLICATION = 'Attendance Tracker'
export const SUPPORTED_BACKUP_VERSIONS = new Set([BACKUP_VERSION])

export type BackupImportMode = 'merge' | 'replace'

export type BackupDataSet = {
  students: Student[]
  subjects: Subject[]
  timetable: TimetableEntry[]
  academicDays: AcademicDay[]
  attendance: AttendanceRecord[]
}

export type BackupPayload = {
  backupVersion: string
  application: string
  exportedAt: string

  group: {
    id: string
    name: string
    college_name?: string
    class_name?: string
    academic_year?: string

    academic_start_date?: string | null
    working_days?: string[]
    lunch_start?: string | null
    lunch_end?: string | null
  }

  data: BackupDataSet
}

export type BackupSummary = {
  students: number
  subjects: number
  timetable: number
  academicDays: number
  attendance: number
}

export type BackupValidationResult = {
  valid: boolean
  errors: string[]
  summary: BackupSummary
  hasData: boolean
}

const VALID_ATTENDANCE_STATUSES = new Set([
  'PRESENT',
  'ABSENT',
  'NOT_CONDUCTED',
])

const VALID_DAY_TYPES = new Set([
  'NORMAL',
  'HOLIDAY',
  'SPECIAL_CLASS',
  'EXAM',
  'COLLEGE_EVENT',
])

const SECRET_FIELD_PATTERN =
  /(password|passwd|secret|token|api[_-]?key|refresh[_-]?token|access[_-]?token|session[_-]?secret|service[-_]?role|private[-_]?key)/i

const isValidUuid = (value: string | null | undefined) => {
  if (!value) return false

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}

const isIsoDate = (value: string | null | undefined) => {
  if (!value) return false

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const date = new Date(`${value}T00:00:00`)

  return !Number.isNaN(date.getTime())
}

/**
 * Accept PostgreSQL TIME values in either:
 *
 * HH:MM
 * HH:MM:SS
 * HH:MM:SS.sss...
 *
 * Supabase commonly returns TIME values as HH:MM:SS.
 */
const isIsoTime = (value: string | null | undefined) => {
  if (!value) return false

  return /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?$/.test(
    value,
  )
}

/**
 * Convert any valid PostgreSQL time into HH:MM:SS.
 *
 * Examples:
 * 09:30      -> 09:30:00
 * 09:30:00   -> 09:30:00
 * 09:30:00.5 -> 09:30:00.5
 */
const normalizeTime = (value: string) => {
  if (/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    return `${value}:00`
  }

  return value
}

const isIsoTimestamp = (value: string | null | undefined) => {
  if (!value) return false

  return !Number.isNaN(new Date(value).getTime())
}

export function buildBackupFileName(groupName: string) {
  const safeName = groupName
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()

  const dateStamp = new Date().toISOString().slice(0, 10)

  return `attendance-tracker-${safeName || 'group'}-${dateStamp}.json`
}

export function validateBackupPayload(
  payload: unknown,
): BackupValidationResult {
  const errors: string[] = []

  const summary: BackupSummary = {
    students: 0,
    subjects: 0,
    timetable: 0,
    academicDays: 0,
    attendance: 0,
  }

  if (!payload || typeof payload !== 'object') {
    return {
      valid: false,
      errors: ['Backup file is empty or not an object.'],
      summary,
      hasData: false,
    }
  }

  const candidate = payload as Record<string, unknown>

  const secretLikeKeys = Object.keys(candidate).filter((key) =>
    SECRET_FIELD_PATTERN.test(key),
  )

  if (secretLikeKeys.length > 0) {
    errors.push(
      `Backup payload contains sensitive field(s): ${secretLikeKeys.join(
        ', ',
      )}. Remove secrets before import.`,
    )
  }

  if (candidate.backupVersion !== BACKUP_VERSION) {
    errors.push(
      `Unsupported backupVersion: ${String(
        candidate.backupVersion ?? 'missing',
      )}. Supported version is ${BACKUP_VERSION}.`,
    )
  }

  if (candidate.application !== BACKUP_APPLICATION) {
    errors.push(
      `Unsupported application identifier: ${String(
        candidate.application ?? 'missing',
      )}.`,
    )
  }

  if (
    !candidate.exportedAt ||
    !isIsoTimestamp(String(candidate.exportedAt))
  ) {
    errors.push(
      'exportedAt is required and must be a valid ISO 8601 timestamp.',
    )
  }

  if (!candidate.group || typeof candidate.group !== 'object') {
    errors.push('Backup group metadata is missing.')
  } else {
    const group = candidate.group as Record<string, unknown>

    if (!isValidUuid(String(group.id ?? ''))) {
      errors.push('Backup group id is missing or invalid.')
    }

    if (
      typeof group.name !== 'string' ||
      group.name.trim().length === 0
    ) {
      errors.push('Backup group name is required.')
    }

    if (
      group.academic_start_date !== undefined &&
      group.academic_start_date !== null &&
      !isIsoDate(String(group.academic_start_date))
    ) {
      errors.push('Backup group has an invalid academic_start_date.')
    }

    if (
      group.working_days !== undefined &&
      !Array.isArray(group.working_days)
    ) {
      errors.push('Backup group working_days must be an array.')
    }

    if (
      group.lunch_start !== undefined &&
      group.lunch_start !== null &&
      !isIsoTime(String(group.lunch_start))
    ) {
      errors.push('Backup group has an invalid lunch_start.')
    }

    if (
      group.lunch_end !== undefined &&
      group.lunch_end !== null &&
      !isIsoTime(String(group.lunch_end))
    ) {
      errors.push('Backup group has an invalid lunch_end.')
    }
  }

  const data =
    candidate.data && typeof candidate.data === 'object'
      ? (candidate.data as Record<string, unknown>)
      : null

  if (!data) {
    return {
      valid: false,
      errors: [...errors, 'Backup data section is missing.'],
      summary,
      hasData: false,
    }
  }

  const sections = [
    ['students', data.students],
    ['subjects', data.subjects],
    ['timetable', data.timetable],
    ['academicDays', data.academicDays],
    ['attendance', data.attendance],
  ] as const

  for (const [sectionName, sectionValue] of sections) {
    if (!Array.isArray(sectionValue)) {
      errors.push(
        `The ${sectionName} section is missing or is not an array.`,
      )
      continue
    }

    if (sectionName === 'students') {
      summary.students = sectionValue.length
    } else if (sectionName === 'subjects') {
      summary.subjects = sectionValue.length
    } else if (sectionName === 'timetable') {
      summary.timetable = sectionValue.length
    } else if (sectionName === 'academicDays') {
      summary.academicDays = sectionValue.length
    } else if (sectionName === 'attendance') {
      summary.attendance = sectionValue.length
    }
  }

  const group =
    candidate.group && typeof candidate.group === 'object'
      ? (candidate.group as Record<string, unknown>)
      : null

  const groupId =
    typeof group?.id === 'string' ? group.id : undefined

  const studentIds = new Set<string>()
  const subjectIds = new Set<string>()

  // ------------------------------------------------------------
  // Students
  // ------------------------------------------------------------

  const studentRecords = Array.isArray(data.students)
    ? (data.students as Record<string, unknown>[])
    : []

  for (const student of studentRecords) {
    if (!student || typeof student !== 'object') {
      errors.push('A student record is malformed.')
      continue
    }

    const studentId = String(student.id ?? '')

    if (!isValidUuid(studentId)) {
      errors.push('A student record is missing a valid id.')
    }

    if (
      typeof student.name !== 'string' ||
      student.name.trim().length === 0
    ) {
      errors.push('A student record is missing a valid name.')
    }

    if (
      groupId &&
      String(student.group_id ?? '') !== groupId
    ) {
      errors.push(
        'A student record references a different group than the backup group.',
      )
    }

    if (
      !student.created_at ||
      !isIsoTimestamp(String(student.created_at))
    ) {
      errors.push(
        'A student record has an invalid created_at timestamp.',
      )
    }

    if (studentId && studentIds.has(studentId)) {
      errors.push(`Duplicate student id detected: ${studentId}`)
    }

    if (studentId) {
      studentIds.add(studentId)
    }
  }

  // ------------------------------------------------------------
  // Subjects
  // ------------------------------------------------------------

  const subjectRecords = Array.isArray(data.subjects)
    ? (data.subjects as Record<string, unknown>[])
    : []

  for (const subject of subjectRecords) {
    if (!subject || typeof subject !== 'object') {
      errors.push('A subject record is malformed.')
      continue
    }

    const subjectId = String(subject.id ?? '')

    if (!isValidUuid(subjectId)) {
      errors.push('A subject record is missing a valid id.')
    }

    if (
      typeof subject.name !== 'string' ||
      subject.name.trim().length === 0
    ) {
      errors.push('A subject record is missing a valid name.')
    }

    if (
      groupId &&
      String(subject.group_id ?? '') !== groupId
    ) {
      errors.push(
        'A subject record references a different group than the backup group.',
      )
    }

    if (typeof subject.is_active !== 'boolean') {
      errors.push(
        'A subject record must include a boolean is_active flag.',
      )
    }

    if (
      !subject.created_at ||
      !isIsoTimestamp(String(subject.created_at))
    ) {
      errors.push(
        'A subject record has an invalid created_at timestamp.',
      )
    }

    if (subjectId && subjectIds.has(subjectId)) {
      errors.push(`Duplicate subject id detected: ${subjectId}`)
    }

    if (subjectId) {
      subjectIds.add(subjectId)
    }
  }

  // ------------------------------------------------------------
  // Timetable
  // ------------------------------------------------------------

  const timetableRecords = Array.isArray(data.timetable)
    ? (data.timetable as Record<string, unknown>[])
    : []

  const timetableKeySet = new Set<string>()

  for (const entry of timetableRecords) {
    if (!entry || typeof entry !== 'object') {
      errors.push('A timetable record is malformed.')
      continue
    }

    const id = String(entry.id ?? '')
    const startTime = String(entry.start_time ?? '')
    const endTime = String(entry.end_time ?? '')

    if (!isValidUuid(id)) {
      errors.push(
        'A timetable record is missing a valid id.',
      )
    }

    if (
      groupId &&
      String(entry.group_id ?? '') !== groupId
    ) {
      errors.push(
        'A timetable record references a different group than the backup group.',
      )
    }

    const dayOfWeek = Number(entry.day_of_week)

    if (
      !Number.isFinite(dayOfWeek) ||
      dayOfWeek < 0 ||
      dayOfWeek > 6
    ) {
      errors.push(
        'A timetable record has an invalid day_of_week value.',
      )
    }

    if (!isValidUuid(String(entry.subject_id ?? ''))) {
      errors.push(
        'A timetable record is missing a valid subject_id.',
      )
    }

    // FIX:
    // Accept both HH:MM and PostgreSQL HH:MM:SS.
    if (!isIsoTime(startTime)) {
      errors.push(
        `A timetable record has an invalid start_time: ${startTime || 'missing'}.`,
      )
    }

    if (!isIsoTime(endTime)) {
      errors.push(
        `A timetable record has an invalid end_time: ${endTime || 'missing'}.`,
      )
    }

    const normalizedStart = isIsoTime(startTime)
      ? normalizeTime(startTime)
      : startTime

    const normalizedEnd = isIsoTime(endTime)
      ? normalizeTime(endTime)
      : endTime

    if (
      normalizedStart &&
      normalizedEnd &&
      normalizedStart >= normalizedEnd
    ) {
      errors.push(
        'A timetable record must have end_time after start_time.',
      )
    }

    if (id) {
      const key = [
        String(entry.group_id),
        dayOfWeek,
        String(entry.subject_id),
        normalizedStart,
        normalizedEnd,
      ].join('|')

      if (timetableKeySet.has(key)) {
        errors.push(
          `Duplicate timetable key detected for ${String(
            entry.subject_id,
          )} on day ${entry.day_of_week}.`,
        )
      }

      timetableKeySet.add(key)
    }
  }

  // ------------------------------------------------------------
  // Academic Days
  // ------------------------------------------------------------

  const academicDayRecords = Array.isArray(data.academicDays)
    ? (data.academicDays as Record<string, unknown>[])
    : []

  const academicDayKeySet = new Set<string>()

  for (const academicDay of academicDayRecords) {
    if (!academicDay || typeof academicDay !== 'object') {
      errors.push('An academic day record is malformed.')
      continue
    }

    const id = String(academicDay.id ?? '')

    if (!isValidUuid(id)) {
      errors.push(
        'An academic day record is missing a valid id.',
      )
    }

    if (
      groupId &&
      String(academicDay.group_id ?? '') !== groupId
    ) {
      errors.push(
        'An academic day record references a different group than the backup group.',
      )
    }

    if (!isIsoDate(String(academicDay.date ?? ''))) {
      errors.push(
        'An academic day record has an invalid date.',
      )
    }

    if (
      typeof academicDay.day_type !== 'string' ||
      !VALID_DAY_TYPES.has(academicDay.day_type)
    ) {
      errors.push(
        `Unsupported academic day type: ${String(
          academicDay.day_type ?? 'missing',
        )}.`,
      )
    }

    if (id) {
      const key = [
        String(academicDay.group_id),
        String(academicDay.date),
      ].join('|')

      if (academicDayKeySet.has(key)) {
        errors.push(
          `Duplicate academic day date detected: ${String(
            academicDay.date,
          )}`,
        )
      }

      academicDayKeySet.add(key)
    }
  }

  // ------------------------------------------------------------
  // Attendance
  // ------------------------------------------------------------

  const attendanceRecords = Array.isArray(data.attendance)
    ? (data.attendance as Record<string, unknown>[])
    : []

  const attendanceKeySet = new Set<string>()

  for (const record of attendanceRecords) {
    if (!record || typeof record !== 'object') {
      errors.push('An attendance record is malformed.')
      continue
    }

    const id = String(record.id ?? '')
    const startTime = String(record.start_time ?? '')
    const endTime = String(record.end_time ?? '')

    if (!isValidUuid(id)) {
      errors.push(
        'An attendance record is missing a valid id.',
      )
    }

    if (!isValidUuid(String(record.student_id ?? ''))) {
      errors.push(
        'An attendance record is missing a valid student_id.',
      )
    }

    if (!isValidUuid(String(record.subject_id ?? ''))) {
      errors.push(
        'An attendance record is missing a valid subject_id.',
      )
    }

    if (!isIsoDate(String(record.date ?? ''))) {
      errors.push(
        'An attendance record contains an invalid date.',
      )
    }

    if (!isIsoTime(startTime)) {
      errors.push(
        `An attendance record contains an invalid start_time: ${
          startTime || 'missing'
        }.`,
      )
    }

    if (!isIsoTime(endTime)) {
      errors.push(
        `An attendance record contains an invalid end_time: ${
          endTime || 'missing'
        }.`,
      )
    }

    if (
      !Number.isFinite(Number(record.duration_minutes)) ||
      Number(record.duration_minutes) <= 0
    ) {
      errors.push(
        'An attendance record must include a positive duration_minutes value.',
      )
    }

    if (
      typeof record.status !== 'string' ||
      !VALID_ATTENDANCE_STATUSES.has(record.status)
    ) {
      errors.push(
        `Unsupported attendance status: ${String(
          record.status ?? 'missing',
        )}.`,
      )
    }

    const normalizedStart = isIsoTime(startTime)
      ? normalizeTime(startTime)
      : startTime

    const normalizedEnd = isIsoTime(endTime)
      ? normalizeTime(endTime)
      : endTime

    if (
      normalizedStart &&
      normalizedEnd &&
      normalizedStart >= normalizedEnd
    ) {
      errors.push(
        'An attendance record must have end_time after start_time.',
      )
    }

    if (
      record.student_id &&
      !studentIds.has(String(record.student_id))
    ) {
      errors.push(
        `Attendance references unknown student id: ${String(
          record.student_id,
        )}`,
      )
    }

    if (
      record.subject_id &&
      !subjectIds.has(String(record.subject_id))
    ) {
      errors.push(
        `Attendance references unknown subject id: ${String(
          record.subject_id,
        )}`,
      )
    }

    if (id) {
      const key = [
        String(record.student_id),
        String(record.date),
        String(record.subject_id),
        normalizedStart,
        normalizedEnd,
      ].join('|')

      if (attendanceKeySet.has(key)) {
        errors.push(
          `Duplicate attendance record detected for ${String(
            record.student_id,
          )} on ${String(record.date)}.`,
        )
      }

      attendanceKeySet.add(key)
    }
  }

  const hasData =
    summary.students > 0 ||
    summary.subjects > 0 ||
    summary.timetable > 0 ||
    summary.academicDays > 0 ||
    summary.attendance > 0

  return {
    valid: errors.length === 0,
    errors,
    summary,
    hasData,
  }
}

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser()

  if (error) throw error

  if (!data.user) {
    throw new Error(
      'Authentication required for backup operations.',
    )
  }

  return data.user.id
}

async function getUserGroupRole(groupId: string) {
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error

  if (!data) {
    throw new Error('You are not a member of this group.')
  }

  return data.role as UserRole
}

async function readGroupData(groupId: string) {
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .maybeSingle()

  if (groupError) throw groupError

  if (!group) {
    throw new Error('Group not found.')
  }

  // Get students first because attendance depends on student ids.
  const { data: studentsData, error: studentsError } =
    await supabase
      .from('students')
      .select('*')
      .eq('group_id', groupId)

  if (studentsError) throw studentsError

  const students = (studentsData ?? []) as Student[]

  const studentIds = students.map((student) => student.id)

  const [
    subjectsResult,
    timetableResult,
    academicDaysResult,
    attendanceResult,
  ] = await Promise.all([
    supabase
      .from('subjects')
      .select('*')
      .eq('group_id', groupId),

    supabase
      .from('timetable')
      .select('*')
      .eq('group_id', groupId),

    supabase
      .from('academic_days')
      .select('*')
      .eq('group_id', groupId),

    studentIds.length > 0
      ? supabase
          .from('attendance')
          .select('*')
          .in('student_id', studentIds)
      : Promise.resolve({
          data: [],
          error: null,
        }),
  ])

  if (subjectsResult.error) {
    throw subjectsResult.error
  }

  if (timetableResult.error) {
    throw timetableResult.error
  }

  if (academicDaysResult.error) {
    throw academicDaysResult.error
  }

  if (attendanceResult.error) {
    throw attendanceResult.error
  }

  return {
    group: group as Group,
    students,
    subjects: (subjectsResult.data ?? []) as Subject[],
    timetable: (timetableResult.data ?? []) as TimetableEntry[],
    academicDays: (academicDaysResult.data ??
      []) as AcademicDay[],
    attendance: (attendanceResult.data ??
      []) as AttendanceRecord[],
  }
}

export async function exportGroupBackup(
  groupId: string,
): Promise<BackupPayload> {
  await getUserGroupRole(groupId)

  const {
    group,
    students,
    subjects,
    timetable,
    academicDays,
    attendance,
  } = await readGroupData(groupId)

  return {
    backupVersion: BACKUP_VERSION,
    application: BACKUP_APPLICATION,
    exportedAt: new Date().toISOString(),

    group: {
      id: group.id,
      name: group.name,
      college_name: group.college_name,
      class_name: group.class_name,
      academic_year: group.academic_year,

      academic_start_date:
        group.academic_start_date ?? null,

      working_days: Array.isArray(group.working_days)
        ? group.working_days
        : [],

      lunch_start: group.lunch_start ?? null,
      lunch_end: group.lunch_end ?? null,
    },

    data: {
      students,
      subjects,
      timetable,
      academicDays,
      attendance,
    },
  }
}

async function verifyImportedData(
  groupId: string,
  expectedSummary: BackupSummary,
) {
  const { data: studentsData, error: studentsLookupError } =
    await supabase
      .from('students')
      .select('id')
      .eq('group_id', groupId)

  if (studentsLookupError) {
    throw studentsLookupError
  }

  const studentIds = (studentsData ?? []).map(
    (row) => row.id,
  )

  const [
    students,
    subjects,
    timetable,
    academicDays,
    attendance,
  ] = await Promise.all([
    supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', groupId),

    supabase
      .from('subjects')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', groupId),

    supabase
      .from('timetable')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', groupId),

    supabase
      .from('academic_days')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', groupId),

    studentIds.length > 0
      ? supabase
          .from('attendance')
          .select('id', { count: 'exact', head: true })
          .in('student_id', studentIds)
      : Promise.resolve({
          count: 0,
          error: null,
        }),
  ])

  const errors: string[] = []

  if (students.error) errors.push(students.error.message)
  if (subjects.error) errors.push(subjects.error.message)
  if (timetable.error) errors.push(timetable.error.message)
  if (academicDays.error) {
    errors.push(academicDays.error.message)
  }
  if (attendance.error) {
    errors.push(attendance.error.message)
  }

  if (
    students.count !== expectedSummary.students
  ) {
    errors.push(
      `Student count mismatch after import: expected ${expectedSummary.students}, found ${students.count ?? 0}.`,
    )
  }

  if (
    subjects.count !== expectedSummary.subjects
  ) {
    errors.push(
      `Subject count mismatch after import: expected ${expectedSummary.subjects}, found ${subjects.count ?? 0}.`,
    )
  }

  if (
    timetable.count !== expectedSummary.timetable
  ) {
    errors.push(
      `Timetable count mismatch after import: expected ${expectedSummary.timetable}, found ${timetable.count ?? 0}.`,
    )
  }

  if (
    academicDays.count !== expectedSummary.academicDays
  ) {
    errors.push(
      `Academic day count mismatch after import: expected ${expectedSummary.academicDays}, found ${academicDays.count ?? 0}.`,
    )
  }

  if (
    attendance.count !== expectedSummary.attendance
  ) {
    errors.push(
      `Attendance count mismatch after import: expected ${expectedSummary.attendance}, found ${attendance.count ?? 0}.`,
    )
  }

  return {
    ok: errors.length === 0,
    errors,
  }
}

async function replaceGroupData(
  groupId: string,
  data: BackupDataSet,
) {
  const {
    data: legacyStudents,
    error: studentLookupError,
  } = await supabase
    .from('students')
    .select('id')
    .eq('group_id', groupId)

  if (studentLookupError) {
    throw studentLookupError
  }

  const studentIds = (legacyStudents ?? []).map(
    (row) => row.id,
  )

  if (studentIds.length > 0) {
    const { error: attendanceDeleteError } =
      await supabase
        .from('attendance')
        .delete()
        .in('student_id', studentIds)

    if (attendanceDeleteError) {
      throw attendanceDeleteError
    }
  }

  const { error: timetableDeleteError } =
    await supabase
      .from('timetable')
      .delete()
      .eq('group_id', groupId)

  if (timetableDeleteError) {
    throw timetableDeleteError
  }

  const { error: academicDeleteError } =
    await supabase
      .from('academic_days')
      .delete()
      .eq('group_id', groupId)

  if (academicDeleteError) {
    throw academicDeleteError
  }

  const { error: studentsDeleteError } =
    await supabase
      .from('students')
      .delete()
      .eq('group_id', groupId)

  if (studentsDeleteError) {
    throw studentsDeleteError
  }

  const { error: subjectsDeleteError } =
    await supabase
      .from('subjects')
      .delete()
      .eq('group_id', groupId)

  if (subjectsDeleteError) {
    throw subjectsDeleteError
  }

  const normalizedTimetable = data.timetable.map(
    (row) => ({
      ...row,
      start_time: normalizeTime(row.start_time),
      end_time: normalizeTime(row.end_time),
    }),
  )

  const normalizedAttendance = data.attendance.map(
    (row) => ({
      ...row,
      start_time: normalizeTime(row.start_time),
      end_time: normalizeTime(row.end_time),
    }),
  )

  const { error: studentInsertError } =
    await supabase
      .from('students')
      .upsert(data.students, {
        onConflict: 'id',
      })
      .select('*')

  if (studentInsertError) {
    throw studentInsertError
  }

  const { error: subjectInsertError } =
    await supabase
      .from('subjects')
      .upsert(data.subjects, {
        onConflict: 'id',
      })
      .select('*')

  if (subjectInsertError) {
    throw subjectInsertError
  }

  const { error: timetableInsertError } =
    await supabase
      .from('timetable')
      .upsert(normalizedTimetable, {
        onConflict: 'id',
      })
      .select('*')

  if (timetableInsertError) {
    throw timetableInsertError
  }

  const { error: academicInsertError } =
    await supabase
      .from('academic_days')
      .upsert(data.academicDays, {
        onConflict: 'id',
      })
      .select('*')

  if (academicInsertError) {
    throw academicInsertError
  }

  const { error: attendanceInsertError } =
    await supabase
      .from('attendance')
      .upsert(normalizedAttendance, {
        onConflict:
          'student_id,date,subject_id,start_time,end_time',
      })
      .select('*')

  if (attendanceInsertError) {
    throw attendanceInsertError
  }
}

async function mergeGroupData(
  groupId: string,
  data: BackupDataSet,
) {
  const normalizedTimetable = data.timetable.map(
    (row) => ({
      ...row,
      group_id: groupId,
      start_time: normalizeTime(row.start_time),
      end_time: normalizeTime(row.end_time),
    }),
  )

  const normalizedAttendance = data.attendance.map(
    (row) => ({
      ...row,
      start_time: normalizeTime(row.start_time),
      end_time: normalizeTime(row.end_time),
    }),
  )

  const { error: studentUpsertError } =
    await supabase
      .from('students')
      .upsert(
        data.students.map((row) => ({
          ...row,
          group_id: groupId,
        })),
        {
          onConflict: 'id',
        },
      )
      .select('*')

  if (studentUpsertError) {
    throw studentUpsertError
  }

  const { error: subjectUpsertError } =
    await supabase
      .from('subjects')
      .upsert(
        data.subjects.map((row) => ({
          ...row,
          group_id: groupId,
        })),
        {
          onConflict: 'id',
        },
      )
      .select('*')

  if (subjectUpsertError) {
    throw subjectUpsertError
  }

  const { error: timetableUpsertError } =
    await supabase
      .from('timetable')
      .upsert(normalizedTimetable, {
        onConflict: 'id',
      })
      .select('*')

  if (timetableUpsertError) {
    throw timetableUpsertError
  }

  const { error: academicUpsertError } =
    await supabase
      .from('academic_days')
      .upsert(
        data.academicDays.map((row) => ({
          ...row,
          group_id: groupId,
        })),
        {
          onConflict: 'id',
        },
      )
      .select('*')

  if (academicUpsertError) {
    throw academicUpsertError
  }

  const { error: attendanceUpsertError } =
    await supabase
      .from('attendance')
      .upsert(normalizedAttendance, {
        onConflict:
          'student_id,date,subject_id,start_time,end_time',
      })
      .select('*')

  if (attendanceUpsertError) {
    throw attendanceUpsertError
  }
}

async function restoreGroupConfiguration(
  groupId: string,
  group: BackupPayload['group'],
) {
  const updateData: Record<string, unknown> = {
    name: group.name,
  }

  if (group.college_name !== undefined) {
    updateData.college_name = group.college_name
  }

  if (group.class_name !== undefined) {
    updateData.class_name = group.class_name
  }

  if (group.academic_year !== undefined) {
    updateData.academic_year = group.academic_year
  }

  if (group.academic_start_date !== undefined) {
    updateData.academic_start_date =
      group.academic_start_date
  }

  if (group.working_days !== undefined) {
    updateData.working_days = group.working_days
  }

  if (group.lunch_start !== undefined) {
    updateData.lunch_start = group.lunch_start
  }

  if (group.lunch_end !== undefined) {
    updateData.lunch_end = group.lunch_end
  }

  const { error } = await supabase
    .from('groups')
    .update(updateData)
    .eq('id', groupId)

  if (error) {
    throw error
  }
}

export async function importGroupBackup(
  payload: BackupPayload,
  targetGroupId: string,
  mode: BackupImportMode = 'replace',
) {
  const validation = validateBackupPayload(payload)

  if (!validation.valid) {
    throw new Error(validation.errors.join(' '))
  }

  if (!validation.hasData) {
    throw new Error(
      'The selected backup does not contain any supported records to import.',
    )
  }

  if (
    payload.group.id &&
    targetGroupId &&
    payload.group.id !== targetGroupId
  ) {
    throw new Error(
      `This backup belongs to group ${payload.group.id}, but the selected group is ${targetGroupId}. Import requires matching group ids.`,
    )
  }

  const role = await getUserGroupRole(targetGroupId)

  if (!['owner', 'admin'].includes(role)) {
    throw new Error(
      'Only group owners or admins can restore or replace data for a group.',
    )
  }

  if (mode === 'replace') {
    await replaceGroupData(
      targetGroupId,
      payload.data,
    )
  } else {
    await mergeGroupData(
      targetGroupId,
      payload.data,
    )
  }

  await restoreGroupConfiguration(
    targetGroupId,
    payload.group,
  )

  const verification = await verifyImportedData(
    targetGroupId,
    validation.summary,
  )

  if (!verification.ok) {
    throw new Error(
      verification.errors.join(' '),
    )
  }

  return {
    mode,
    groupId: targetGroupId,
    summary: validation.summary,
    verification,
  }
}