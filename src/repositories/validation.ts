import type { AttendanceStatus, UserRole } from '../types/database'

export const VALID_GROUP_ROLES = ['owner', 'admin', 'member'] as const
export const VALID_ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'NOT_CONDUCTED'] as const

export const INITIAL_SUBJECTS = [
  'Computer Networks',
  'Software Engineering',
  'DBMS',
  'ML',
  'IPR',
  'DAA',
  'ML Lab',
  'DBMS Lab',
  'Skill Lab',
  'Internship',
] as const

export function isValidGroupRole(role: string): role is UserRole {
  return VALID_GROUP_ROLES.includes(role as UserRole)
}

export function isValidAttendanceStatus(status: string): status is AttendanceStatus {
  return VALID_ATTENDANCE_STATUSES.includes(status as AttendanceStatus)
}

export function assertValidGroupRole(role: string): asserts role is UserRole {
  if (!isValidGroupRole(role)) {
    throw new Error(`Invalid role: ${role}`)
  }
}

export function assertValidAttendanceStatus(status: string): asserts status is AttendanceStatus {
  if (!isValidAttendanceStatus(status)) {
    throw new Error(`Invalid attendance status: ${status}`)
  }
}
