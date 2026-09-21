import { describe, expect, it } from 'vitest'
import { normalizeAdjustmentReason, validateManualAttendanceAdjustment } from './attendanceAdjustments'

describe('manual attendance adjustment validation', () => {
  it('accepts a valid reason and actual status change', () => {
    const result = validateManualAttendanceAdjustment('ABSENT', 'PRESENT', '  Student was marked absent accidentally.  ')

    expect(result.valid).toBe(true)
    expect(result.normalizedReason).toBe('Student was marked absent accidentally.')
  })

  it('rejects a status that does not actually change', () => {
    const result = validateManualAttendanceAdjustment('PRESENT', 'PRESENT', 'No actual change')

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('A manual adjustment requires a different attendance status.')
  })

  it('rejects blank or whitespace-only reasons', () => {
    const result = validateManualAttendanceAdjustment('ABSENT', 'PRESENT', '   ')

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('A reason is required for every manual attendance adjustment.')
  })

  it('keeps a trimmed reason for audit history', () => {
    expect(normalizeAdjustmentReason('  Marked absent by mistake.  ')).toBe('Marked absent by mistake.')
    expect(normalizeAdjustmentReason('   ')).toBe('')
  })
})
