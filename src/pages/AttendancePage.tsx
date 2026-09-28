import { useEffect, useMemo, useState } from 'react'
import { listAcademicDaysByGroup } from '../repositories/academicDays'
import { listAttendanceForDateAndGroup, upsertAttendanceRecord } from '../repositories/attendance'
import { listStudentsByGroup } from '../repositories/students'
import { listTimetableByGroup } from '../repositories/timetable'
import { supabase } from '../lib/supabase'
import { DEFAULT_WORKING_DAYS, isHolidayDate, isWorkingAcademicDate, resolveScheduledClassesForDate } from '../utils/schedule'
import type { AcademicDay, AttendanceRecord, Student, Subject, TimetableEntry } from '../types/database'

const formatDateValue = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const addDays = (dateString: string, amount: number): string => {
  const next = new Date(`${dateString}T12:00:00`)
  next.setDate(next.getDate() + amount)
  return formatDateValue(next)
}

const getDayName = (dateString: string): string => {
  const day = new Date(`${dateString}T12:00:00`)
  return day.toLocaleDateString('en-US', { weekday: 'long' })
}

const getDurationMinutes = (startTime: string, endTime: string): number => {
  const startMinutes = Number(startTime.slice(0, 2)) * 60 + Number(startTime.slice(3, 5))
  const endMinutes = Number(endTime.slice(0, 2)) * 60 + Number(endTime.slice(3, 5))
  return Math.max(0, endMinutes - startMinutes)
}

const classStatusFromRecords = (records: AttendanceRecord[]): 'CONDUCTED' | 'NOT_CONDUCTED' | 'UNSET' => {
  if (records.some((record) => record.status === 'PRESENT' || record.status === 'ABSENT')) {
    return 'CONDUCTED'
  }

  if (records.some((record) => record.status === 'NOT_CONDUCTED')) {
    return 'NOT_CONDUCTED'
  }

  return 'UNSET'
}

export function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState(() => formatDateValue(new Date()))
  const [groupId, setGroupId] = useState<string | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([])
  const [academicDays, setAcademicDays] = useState<AcademicDay[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [classMode, setClassMode] = useState<Record<string, 'CONDUCTED' | 'NOT_CONDUCTED' | 'UNSET'>>({})
  const [adjustmentDraft, setAdjustmentDraft] = useState<{
    record: AttendanceRecord | null
    newStatus: 'PRESENT' | 'ABSENT' | 'NOT_CONDUCTED'
    reason: string
    reviewing: boolean
  }>({ record: null, newStatus: 'PRESENT', reason: '', reviewing: false })

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError('')

        const { data: groups, error: groupError } = await supabase.from('groups').select('*').limit(1)
        if (groupError) throw groupError

        const currentGroup = groups?.[0]
        if (!currentGroup) {
          setGroupId(null)
          setStudents([])
          setSubjects([])
          setTimetableEntries([])
          setAcademicDays([])
          setAttendanceRecords([])
          return
        }

        setGroupId(currentGroup.id)

        const [studentRows, subjectRows, timetableRows, academicRows, attendanceRows] = await Promise.all([
          listStudentsByGroup(currentGroup.id),
          supabase.from('subjects').select('*').eq('group_id', currentGroup.id).then((result) => result.data ?? [] as Subject[]),
          listTimetableByGroup(currentGroup.id),
          listAcademicDaysByGroup(currentGroup.id),
          listAttendanceForDateAndGroup(currentGroup.id, selectedDate),
        ])

        setStudents(studentRows)
        setSubjects(subjectRows as Subject[])
        setTimetableEntries(timetableRows)
        setAcademicDays(academicRows)
        setAttendanceRecords(attendanceRows)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load attendance schedule.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [selectedDate])

  const subjectMap = useMemo(
    () => Object.fromEntries(subjects.map((subject) => [subject.id, subject.name] as const)),
    [subjects],
  )

  const scheduledClasses = useMemo(() => {
    if (!groupId) {
      return []
    }

    return resolveScheduledClassesForDate(selectedDate, timetableEntries, DEFAULT_WORKING_DAYS, academicDays)
  }, [academicDays, groupId, selectedDate, timetableEntries])

  const recordsByClass = useMemo(() => {
    const next: Record<string, AttendanceRecord[]> = {}

    for (const record of attendanceRecords) {
      const key = `${record.subject_id}:${record.start_time}:${record.end_time}`
      next[key] = [...(next[key] ?? []), record]
    }

    return next
  }, [attendanceRecords])

  const isNonWorkingDate = !isWorkingAcademicDate(selectedDate, DEFAULT_WORKING_DAYS, academicDays) || isHolidayDate(selectedDate, academicDays)

  const setStudentAttendance = async (classEntry: TimetableEntry, studentId: string, status: 'PRESENT' | 'ABSENT' | 'NOT_CONDUCTED') => {
    if (!groupId) {
      return
    }

    const durationMinutes = getDurationMinutes(classEntry.start_time, classEntry.end_time)

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const saved = await upsertAttendanceRecord({
        student_id: studentId,
        date: selectedDate,
        subject_id: classEntry.subject_id,
        class_group_id: classEntry.class_group_id ?? null,
        start_time: classEntry.start_time,
        end_time: classEntry.end_time,
        duration_minutes: durationMinutes,
        status,
        updated_by: null,
      })

      setAttendanceRecords((current) => {
        const withoutExisting = current.filter(
          (record) => !(record.student_id === studentId && record.subject_id === classEntry.subject_id && record.start_time === classEntry.start_time && record.end_time === classEntry.end_time && record.date === selectedDate),
        )
        return [...withoutExisting, saved]
      })

      setClassMode((current) => ({ ...current, [`${classEntry.subject_id}:${classEntry.start_time}:${classEntry.end_time}`]: status === 'NOT_CONDUCTED' ? 'NOT_CONDUCTED' : 'CONDUCTED' }))
      setSuccess('Attendance saved successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save attendance.')
    } finally {
      setSaving(false)
    }
  }

  const markAllPresent = async (classEntry: TimetableEntry) => {
    if (!groupId) {
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const classKey = `${classEntry.subject_id}:${classEntry.start_time}:${classEntry.end_time}`
      const updatedRecords: AttendanceRecord[] = []

      for (const student of students) {
        const saved = await upsertAttendanceRecord({
          student_id: student.id,
          date: selectedDate,
          subject_id: classEntry.subject_id,
          class_group_id: classEntry.class_group_id ?? null,
          start_time: classEntry.start_time,
          end_time: classEntry.end_time,
          duration_minutes: getDurationMinutes(classEntry.start_time, classEntry.end_time),
          status: 'PRESENT',
          updated_by: null,
        })
        updatedRecords.push(saved)
      }

      setAttendanceRecords((current) => {
        const withoutClass = current.filter(
          (record) => !(record.subject_id === classEntry.subject_id && record.start_time === classEntry.start_time && record.end_time === classEntry.end_time && record.date === selectedDate),
        )
        return [...withoutClass, ...updatedRecords]
      })

      setClassMode((current) => ({ ...current, [classKey]: 'CONDUCTED' }))
      setSuccess('All students marked present for this class.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to mark all students present.')
    } finally {
      setSaving(false)
    }
  }

  const markClassNotConducted = async (classEntry: TimetableEntry) => {
    if (!groupId) {
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const classKey = `${classEntry.subject_id}:${classEntry.start_time}:${classEntry.end_time}`
      const updatedRecords: AttendanceRecord[] = []

      for (const student of students) {
        const saved = await upsertAttendanceRecord({
          student_id: student.id,
          date: selectedDate,
          subject_id: classEntry.subject_id,
          class_group_id: classEntry.class_group_id ?? null,
          start_time: classEntry.start_time,
          end_time: classEntry.end_time,
          duration_minutes: getDurationMinutes(classEntry.start_time, classEntry.end_time),
          status: 'NOT_CONDUCTED',
          updated_by: null,
          reason: 'Class not conducted',
        })
        updatedRecords.push(saved)
      }

      setAttendanceRecords((current) => {
        const withoutClass = current.filter(
          (record) => !(record.subject_id === classEntry.subject_id && record.start_time === classEntry.start_time && record.end_time === classEntry.end_time && record.date === selectedDate),
        )
        return [...withoutClass, ...updatedRecords]
      })

      setClassMode((current) => ({ ...current, [classKey]: 'NOT_CONDUCTED' }))
      setSuccess('Class marked as not conducted.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to mark class as not conducted.')
    } finally {
      setSaving(false)
    }
  }

  const openAdjustment = (record: AttendanceRecord) => {
    setAdjustmentDraft({
      record,
      newStatus: record.status === 'PRESENT' ? 'ABSENT' : 'PRESENT',
      reason: '',
      reviewing: false,
    })
    setError('')
    setSuccess('')
  }

  const confirmAdjustment = async () => {
    if (!adjustmentDraft.record) {
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const result = await import('../repositories/attendanceAdjustments').then((module) =>
        module.adjustAttendanceRecord({
          attendanceId: adjustmentDraft.record!.id,
          newStatus: adjustmentDraft.newStatus,
          reason: adjustmentDraft.reason,
          expectedPreviousStatus: adjustmentDraft.record!.status,
        }),
      )

      setAttendanceRecords((current) =>
        current.map((record) => (record.id === adjustmentDraft.record!.id ? { ...record, status: adjustmentDraft.newStatus, reason: adjustmentDraft.reason, updated_at: new Date().toISOString() } : record)),
      )

      setAdjustmentDraft({ record: null, newStatus: 'PRESENT', reason: '', reviewing: false })
      setSuccess('Attendance adjusted successfully.')
      setTimeout(() => {
        setSuccess('')
      }, 2400)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to adjust attendance.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="card-surface p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-sky-300">Daily attendance</p>
            <h2 className="mt-2 text-3xl font-bold text-white">{getDayName(selectedDate)}</h2>
            <p className="mt-1 text-sm text-slate-300">{selectedDate}</p>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setSelectedDate((current) => addDays(current, -1))} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-100">Prev</button>
            <button type="button" onClick={() => setSelectedDate(formatDateValue(new Date()))} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-100">Today</button>
            <button type="button" onClick={() => setSelectedDate((current) => addDays(current, 1))} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-100">Next</button>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="card-surface p-6 text-slate-300">Loading attendance schedule...</div>
      ) : null}

      {!loading && error ? <div className="rounded-xl border border-red-500/60 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}
      {!loading && success ? <div className="rounded-xl border border-emerald-500/60 bg-emerald-500/10 p-4 text-sm text-emerald-200">{success}</div> : null}

      {!loading && isNonWorkingDate ? (
        <div className="card-surface p-6">
          <h3 className="text-xl font-semibold text-white">No attendance expected</h3>
          <p className="mt-2 text-slate-300">
            {isHolidayDate(selectedDate, academicDays)
              ? 'This date is marked as a holiday and does not require class attendance.'
              : 'This is a configured non-working day. Normal scheduled classes are not expected.'}
          </p>
        </div>
      ) : null}

      {!loading && !isNonWorkingDate && scheduledClasses.length === 0 ? (
        <div className="card-surface p-6">
          <h3 className="text-xl font-semibold text-white">No classes scheduled</h3>
          <p className="mt-2 text-slate-300">There are no timetable entries for this date in the applicable active range.</p>
        </div>
      ) : null}

      {adjustmentDraft.record ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
            {!adjustmentDraft.reviewing ? (
              <>
                <h3 className="text-2xl font-bold text-white">Adjust Attendance</h3>
                <div className="mt-4 space-y-3 text-sm text-slate-200">
                  <p><span className="text-slate-400">Student:</span> {students.find((student) => student.id === adjustmentDraft.record?.student_id)?.name ?? 'Student'}</p>
                  <p><span className="text-slate-400">Date:</span> {adjustmentDraft.record?.date}</p>
                  <p><span className="text-slate-400">Subject:</span> {subjectMap[adjustmentDraft.record?.subject_id ?? ''] ?? 'Subject'}</p>
                  <p><span className="text-slate-400">Current status:</span> {adjustmentDraft.record?.status}</p>
                </div>

                <label className="mt-5 block text-sm text-slate-200">
                  <span className="mb-1 block">New status</span>
                  <select value={adjustmentDraft.newStatus} onChange={(event) => setAdjustmentDraft((current) => ({ ...current, newStatus: event.target.value as 'PRESENT' | 'ABSENT' | 'NOT_CONDUCTED' }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100">
                    <option value="PRESENT">PRESENT</option>
                    <option value="ABSENT">ABSENT</option>
                    <option value="NOT_CONDUCTED">NOT_CONDUCTED</option>
                  </select>
                </label>

                <label className="mt-4 block text-sm text-slate-200">
                  <span className="mb-1 block">Reason</span>
                  <textarea value={adjustmentDraft.reason} onChange={(event) => setAdjustmentDraft((current) => ({ ...current, reason: event.target.value }))} rows={3} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" placeholder="Marked absent by mistake." />
                </label>

                <div className="mt-5 flex items-center justify-end gap-2">
                  <button type="button" onClick={() => setAdjustmentDraft({ record: null, newStatus: 'PRESENT', reason: '', reviewing: false })} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100">Cancel</button>
                  <button type="button" onClick={() => setAdjustmentDraft((current) => ({ ...current, reviewing: true }))} disabled={!adjustmentDraft.reason.trim() || adjustmentDraft.newStatus === adjustmentDraft.record?.status} className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60">Review Adjustment</button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-white">Review Attendance Adjustment</h3>
                <div className="mt-4 space-y-3 text-sm text-slate-200">
                  <p><span className="text-slate-400">Student:</span> {students.find((student) => student.id === adjustmentDraft.record?.student_id)?.name ?? 'Student'}</p>
                  <p><span className="text-slate-400">Date:</span> {adjustmentDraft.record?.date}</p>
                  <p><span className="text-slate-400">Subject:</span> {subjectMap[adjustmentDraft.record?.subject_id ?? ''] ?? 'Subject'}</p>
                  <p><span className="text-slate-400">Change:</span> {adjustmentDraft.record?.status} → {adjustmentDraft.newStatus}</p>
                  <p><span className="text-slate-400">Reason:</span> {adjustmentDraft.reason}</p>
                  <p><span className="text-slate-400">This change will update attendance calculations and reports.</span></p>
                </div>

                <div className="mt-5 flex items-center justify-end gap-2">
                  <button type="button" onClick={() => setAdjustmentDraft((current) => ({ ...current, reviewing: false }))} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100">Back</button>
                  <button type="button" onClick={() => void confirmAdjustment()} disabled={saving} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60">Confirm Adjustment</button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {!loading && !isNonWorkingDate && scheduledClasses.length > 0 ? (
        <div className="space-y-4">
          {scheduledClasses.map((entry) => {
            const subjectName = subjectMap[entry.subject_id] ?? 'Unassigned subject'
            const classKey = `${entry.subject_id}:${entry.start_time}:${entry.end_time}`
            const classRecords = recordsByClass[classKey] ?? []
            const mode = classMode[classKey] ?? classStatusFromRecords(classRecords)
            const durationMinutes = getDurationMinutes(entry.start_time, entry.end_time)

            return (
              <div key={classKey} className="card-surface p-4 sm:p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm text-slate-400">{entry.start_time} – {entry.end_time} · {durationMinutes} minutes</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">{subjectName}</h3>
                    <p className="mt-1 text-sm text-slate-300">{mode === 'NOT_CONDUCTED' ? 'Not conducted' : mode === 'CONDUCTED' ? 'Conducted' : 'Awaiting class status'}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setClassMode((current) => ({ ...current, [classKey]: 'CONDUCTED' }))} className={`rounded-xl px-4 py-3 text-sm font-semibold ${mode === 'CONDUCTED' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-100'}`}>
                      Conducted
                    </button>
                    <button type="button" onClick={() => void markClassNotConducted(entry)} className={`rounded-xl px-4 py-3 text-sm font-semibold ${mode === 'NOT_CONDUCTED' ? 'bg-rose-500 text-white' : 'bg-slate-700 text-slate-100'}`}>
                      Not Conducted
                    </button>
                    {mode === 'CONDUCTED' ? (
                      <button type="button" onClick={() => void markAllPresent(entry)} disabled={saving} className="rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-70">
                        Mark all present
                      </button>
                    ) : null}
                  </div>
                </div>

                {mode === 'CONDUCTED' ? (
                  <div className="mt-5 space-y-3">
                    {students.length === 0 ? <p className="text-sm text-slate-300">No students are configured for this group.</p> : null}

                    {students.map((student) => {
                      const record = (classRecords ?? []).find((item) => item.student_id === student.id)
                      const currentStatus = record?.status ?? 'ABSENT'

                      return (
                        <div key={student.id} className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-900 p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-medium text-white">{student.name}</p>
                            <p className="text-sm text-slate-300">{student.roll_number || 'No roll number'}</p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => void setStudentAttendance(entry, student.id, 'PRESENT')} className={`rounded-xl px-3 py-2 text-sm font-semibold ${currentStatus === 'PRESENT' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-100'}`}>
                              Present
                            </button>
                            <button type="button" onClick={() => void setStudentAttendance(entry, student.id, 'ABSENT')} className={`rounded-xl px-3 py-2 text-sm font-semibold ${currentStatus === 'ABSENT' ? 'bg-rose-500 text-white' : 'bg-slate-700 text-slate-100'}`}>
                              Absent
                            </button>
                            <button type="button" onClick={() => openAdjustment(record ?? {
                              id: `${student.id}-${selectedDate}-${entry.subject_id}-${entry.start_time}-${entry.end_time}`,
                              student_id: student.id,
                              date: selectedDate,
                              subject_id: entry.subject_id,
                              class_group_id: entry.class_group_id ?? null,
                              start_time: entry.start_time,
                              end_time: entry.end_time,
                              duration_minutes: getDurationMinutes(entry.start_time, entry.end_time),
                              status: currentStatus,
                              created_at: new Date().toISOString(),
                              updated_at: new Date().toISOString(),
                              updated_by: null,
                              reason: null,
                            })} className="rounded-xl border border-sky-500/60 bg-sky-500/10 px-3 py-2 text-sm font-semibold text-sky-200">
                              Adjust
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
