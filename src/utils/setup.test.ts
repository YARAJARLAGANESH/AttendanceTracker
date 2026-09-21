import { describe, expect, it } from 'vitest'
import { isValidGroupRole, isValidAttendanceStatus, INITIAL_SUBJECTS } from '../repositories/validation'

describe('phase 3 setup and data management validation', () => {
  it('accepts the supported group roles', () => {
    expect(isValidGroupRole('owner')).toBe(true)
    expect(isValidGroupRole('admin')).toBe(true)
    expect(isValidGroupRole('member')).toBe(true)
  })

  it('rejects unsupported group roles', () => {
    expect(isValidGroupRole('student')).toBe(false)
  })

  it('accepts the supported attendance statuses', () => {
    expect(isValidAttendanceStatus('PRESENT')).toBe(true)
    expect(isValidAttendanceStatus('ABSENT')).toBe(true)
    expect(isValidAttendanceStatus('NOT_CONDUCTED')).toBe(true)
  })

  it('contains the required initial subject catalog', () => {
    expect(INITIAL_SUBJECTS).toContain('Computer Networks')
    expect(INITIAL_SUBJECTS).toContain('ML Lab')
    expect(INITIAL_SUBJECTS).toContain('Internship')
  })
})
