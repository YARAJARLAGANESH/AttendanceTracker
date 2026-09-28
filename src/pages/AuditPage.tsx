import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getAttendanceAdjustmentDetail, listAttendanceAdjustmentsForGroup } from '../repositories/attendanceAdjustments'
import type { AttendanceAdjustmentListItem } from '../repositories/attendanceAdjustments'

type AuditDetail = AttendanceAdjustmentListItem & {
  adjusted_by_name: string | null
}

export function AuditPage() {
  const [records, setRecords] = useState<AttendanceAdjustmentListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedDetail, setSelectedDetail] = useState<AuditDetail | null>(null)

  const loadAuditRecords = async () => {
    try {
      setLoading(true)
      setError('')

      const { data: groups, error: groupError } = await supabase.from('groups').select('*').limit(1)
      if (groupError) throw groupError

      const currentGroup = groups?.[0]
      if (!currentGroup) {
        setRecords([])
        return
      }

      const nextRecords = await listAttendanceAdjustmentsForGroup(currentGroup.id, {
        studentId: selectedStudent || undefined,
        subjectId: selectedSubject || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status: selectedStatus === '' ? undefined : (selectedStatus as 'PRESENT' | 'ABSENT' | 'NOT_CONDUCTED'),
      })

      setRecords(nextRecords)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load audit history.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAuditRecords()
  }, [selectedStudent, selectedSubject, selectedStatus, startDate, endDate])

  const subjectOptions = useMemo(
    () => [...new Set(records.map((record) => record.subject_name).filter((value): value is string => Boolean(value)))],
    [records],
  )

  const studentOptions = useMemo(
    () => [...new Set(records.map((record) => record.student_name).filter((value): value is string => Boolean(value)))],
    [records],
  )

  const openDetail = async (record: AttendanceAdjustmentListItem) => {
    try {
      const detail = await getAttendanceAdjustmentDetail(record.id)
      setSelectedDetail(detail as AuditDetail | null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load adjustment details.')
    }
  }

  return (
    <div className="space-y-6">
      <header className="card-surface p-5">
        <p className="text-xs uppercase tracking-[0.22em] text-sky-300">Audit</p>
        <h2 className="mt-2 text-3xl font-bold text-white">Attendance Audit History</h2>
      </header>

      {error ? <div className="rounded-xl border border-red-500/60 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}

      <div className="card-surface p-4">
        <div className="grid gap-3 md:grid-cols-5">
          <label className="text-sm text-slate-200">
            <span className="mb-1 block">Student</span>
            <select value={selectedStudent} onChange={(event) => setSelectedStudent(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100">
              <option value="">All students</option>
              {studentOptions.map((student) => (
                <option key={student} value={student}>{student}</option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-200">
            <span className="mb-1 block">Subject</span>
            <select value={selectedSubject} onChange={(event) => setSelectedSubject(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100">
              <option value="">All subjects</option>
              {subjectOptions.map((subject) => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-200">
            <span className="mb-1 block">Status</span>
            <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100">
              <option value="">All statuses</option>
              <option value="PRESENT">PRESENT</option>
              <option value="ABSENT">ABSENT</option>
              <option value="NOT_CONDUCTED">NOT_CONDUCTED</option>
            </select>
          </label>

          <label className="text-sm text-slate-200">
            <span className="mb-1 block">From</span>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
          </label>

          <label className="text-sm text-slate-200">
            <span className="mb-1 block">To</span>
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
          </label>
        </div>
      </div>

      {selectedDetail ? (
        <div className="card-surface p-5">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-xl font-semibold text-white">Attendance Adjustment</h3>
            <button type="button" onClick={() => setSelectedDetail(null)} className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100">Close</button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Student</p><p className="mt-1 text-white">{selectedDetail.student_name ?? 'Unknown student'}</p></div>
            <div><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Subject</p><p className="mt-1 text-white">{selectedDetail.subject_name ?? 'Unknown subject'}</p></div>
            <div><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Date</p><p className="mt-1 text-white">{selectedDetail.attendance_date ?? 'Unknown date'}</p></div>
            <div><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Adjusted by</p><p className="mt-1 text-white">{selectedDetail.adjusted_by_name ?? 'Unknown user'}</p></div>
            <div><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Previous</p><p className="mt-1 text-white">{selectedDetail.previous_status}</p></div>
            <div><p className="text-xs uppercase tracking-[0.2em] text-slate-400">New</p><p className="mt-1 text-white">{selectedDetail.new_status}</p></div>
          </div>

          <div className="mt-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Reason</p>
            <p className="mt-2 rounded-xl border border-slate-700 bg-slate-900 p-3 text-slate-100">{selectedDetail.reason}</p>
          </div>
        </div>
      ) : null}

      <div className="card-surface overflow-hidden">
        {loading ? (
          <div className="p-6 text-slate-300">Loading audit history...</div>
        ) : records.length === 0 ? (
          <div className="p-6 text-slate-300">No attendance adjustments yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-900/60 text-slate-300">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Change</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Adjusted by</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-b border-slate-800 text-slate-100">
                    <td className="px-4 py-3">{record.attendance_date ?? '—'}</td>
                    <td className="px-4 py-3">{record.student_name ?? '—'}</td>
                    <td className="px-4 py-3">{record.subject_name ?? '—'}</td>
                    <td className="px-4 py-3">{record.previous_status} → {record.new_status}</td>
                    <td className="px-4 py-3 max-w-xs">{record.reason}</td>
                    <td className="px-4 py-3">{record.adjusted_by ? record.adjusted_by : 'System'}</td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => void openDetail(record)} className="rounded-xl bg-sky-500 px-3 py-2 text-xs font-semibold text-slate-950">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
