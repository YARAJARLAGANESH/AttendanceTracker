import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  listAttendanceHistoryForGroup,
  type AttendanceAuditListItem,
} from '../repositories/attendanceAdjustments'

export function AuditPage() {
  const [records, setRecords] = useState<
    AttendanceAuditListItem[]
  >([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [selectedStudent, setSelectedStudent] =
    useState('')

  const [selectedSubject, setSelectedSubject] =
    useState('')

  const [selectedStatus, setSelectedStatus] =
    useState('')

  const [startDate, setStartDate] =
    useState('')

  const [endDate, setEndDate] =
    useState('')

  const [selectedDetail, setSelectedDetail] =
    useState<AttendanceAuditListItem | null>(null)

  const [allStudents, setAllStudents] =
    useState<
      Array<{
        id: string
        name: string
      }>
    >([])

  const [allSubjects, setAllSubjects] =
    useState<
      Array<{
        id: string
        name: string
      }>
    >([])

  const loadOptions = async (
    groupId: string,
  ) => {
    const [
      studentsResult,
      subjectsResult,
    ] = await Promise.all([
      supabase
        .from('students')
        .select('id, name')
        .eq('group_id', groupId)
        .order('name'),

      supabase
        .from('subjects')
        .select('id, name')
        .eq('group_id', groupId)
        .order('name'),
    ])

    if (studentsResult.error) {
      throw studentsResult.error
    }

    if (subjectsResult.error) {
      throw subjectsResult.error
    }

    setAllStudents(
      studentsResult.data ?? [],
    )

    setAllSubjects(
      subjectsResult.data ?? [],
    )
  }

  const loadAuditRecords = async () => {
    try {
      setLoading(true)
      setError('')

      /*
       * Get the current group.
       */
      const {
        data: groups,
        error: groupError,
      } = await supabase
        .from('groups')
        .select('*')
        .limit(1)

      if (groupError) {
        throw groupError
      }

      const currentGroup = groups?.[0]

      if (!currentGroup) {
        setRecords([])
        setAllStudents([])
        setAllSubjects([])
        return
      }

      /*
       * Load students and subjects for filters.
       */
      await loadOptions(
        currentGroup.id,
      )

      /*
       * Load actual attendance history.
       */
      const nextRecords =
        await listAttendanceHistoryForGroup(
          currentGroup.id,
          {
            studentId:
              selectedStudent || undefined,

            subjectId:
              selectedSubject || undefined,

            startDate:
              startDate || undefined,

            endDate:
              endDate || undefined,

            status:
              selectedStatus === ''
                ? undefined
                : (selectedStatus as
                    | 'PRESENT'
                    | 'ABSENT'
                    | 'NOT_CONDUCTED'),
          },
        )

      setRecords(nextRecords)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load attendance history.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAuditRecords()
  }, [
    selectedStudent,
    selectedSubject,
    selectedStatus,
    startDate,
    endDate,
  ])

  const presentCount = useMemo(
    () =>
      records.filter(
        (record) =>
          record.status === 'PRESENT',
      ).length,
    [records],
  )

  const absentCount = useMemo(
    () =>
      records.filter(
        (record) =>
          record.status === 'ABSENT',
      ).length,
    [records],
  )

  const notConductedCount = useMemo(
    () =>
      records.filter(
        (record) =>
          record.status ===
          'NOT_CONDUCTED',
      ).length,
    [records],
  )

  const formatDate = (
    date: string,
  ) => {
    const parsed = new Date(
      `${date}T00:00:00`,
    )

    if (
      Number.isNaN(
        parsed.getTime(),
      )
    ) {
      return date
    }

    return parsed.toLocaleDateString(
      'en-IN',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      },
    )
  }

  const formatTime = (
    time: string,
  ) => {
    const [
      hours,
      minutes,
    ] = time
      .split(':')
      .map(Number)

    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes)
    ) {
      return time
    }

    const date = new Date()

    date.setHours(
      hours,
      minutes,
      0,
      0,
    )

    return date.toLocaleTimeString(
      'en-IN',
      {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      },
    )
  }

  const getStatusClass = (
    status: string,
  ) => {
    if (status === 'PRESENT') {
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
    }

    if (status === 'ABSENT') {
      return 'border-red-500/30 bg-red-500/10 text-red-300'
    }

    return 'border-amber-500/30 bg-amber-500/10 text-amber-300'
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <header className="card-surface p-5">
        <p className="text-xs uppercase tracking-[0.22em] text-sky-300">
          Audit
        </p>

        <h2 className="mt-2 text-3xl font-bold text-white">
          Attendance Audit History
        </h2>

        <p className="mt-2 text-sm text-slate-400">
          View complete student attendance history,
          including subjects, periods and attendance status.
        </p>
      </header>

      {/* Error */}
      {error ? (
        <div className="rounded-xl border border-red-500/60 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">

        <div className="card-surface p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
            Total Records
          </p>

          <p className="mt-2 text-2xl font-bold text-white">
            {records.length}
          </p>
        </div>

        <div className="card-surface p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
            Present
          </p>

          <p className="mt-2 text-2xl font-bold text-emerald-300">
            {presentCount}
          </p>
        </div>

        <div className="card-surface p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
            Absent
          </p>

          <p className="mt-2 text-2xl font-bold text-red-300">
            {absentCount}
          </p>
        </div>

        <div className="card-surface p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
            Not Conducted
          </p>

          <p className="mt-2 text-2xl font-bold text-amber-300">
            {notConductedCount}
          </p>
        </div>

      </div>

      {/* Filters */}
      <div className="card-surface p-4">
        <div className="grid gap-3 md:grid-cols-5">

          {/* Student */}
          <label className="text-sm text-slate-200">
            <span className="mb-1 block">
              Student
            </span>

            <select
              value={selectedStudent}
              onChange={(event) =>
                setSelectedStudent(
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
            >
              <option value="">
                All students
              </option>

              {allStudents.map(
                (student) => (
                  <option
                    key={student.id}
                    value={student.id}
                  >
                    {student.name}
                  </option>
                ),
              )}
            </select>
          </label>

          {/* Subject */}
          <label className="text-sm text-slate-200">
            <span className="mb-1 block">
              Subject
            </span>

            <select
              value={selectedSubject}
              onChange={(event) =>
                setSelectedSubject(
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
            >
              <option value="">
                All subjects
              </option>

              {allSubjects.map(
                (subject) => (
                  <option
                    key={subject.id}
                    value={subject.id}
                  >
                    {subject.name}
                  </option>
                ),
              )}
            </select>
          </label>

          {/* Status */}
          <label className="text-sm text-slate-200">
            <span className="mb-1 block">
              Status
            </span>

            <select
              value={selectedStatus}
              onChange={(event) =>
                setSelectedStatus(
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
            >
              <option value="">
                All statuses
              </option>

              <option value="PRESENT">
                PRESENT
              </option>

              <option value="ABSENT">
                ABSENT
              </option>

              <option value="NOT_CONDUCTED">
                NOT_CONDUCTED
              </option>
            </select>
          </label>

          {/* From */}
          <label className="text-sm text-slate-200">
            <span className="mb-1 block">
              From
            </span>

            <input
              type="date"
              value={startDate}
              onChange={(event) =>
                setStartDate(
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
            />
          </label>

          {/* To */}
          <label className="text-sm text-slate-200">
            <span className="mb-1 block">
              To
            </span>

            <input
              type="date"
              value={endDate}
              onChange={(event) =>
                setEndDate(
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
            />
          </label>

        </div>
      </div>

      {/* Detail panel */}
      {selectedDetail ? (
        <div className="card-surface p-5">

          <div className="flex items-center justify-between gap-4">

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-sky-300">
                Attendance Details
              </p>

              <h3 className="mt-1 text-xl font-semibold text-white">
                {selectedDetail.student_name ??
                  'Unknown student'}
              </h3>
            </div>

            <button
              type="button"
              onClick={() =>
                setSelectedDetail(null)
              }
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              Close
            </button>

          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Student
              </p>

              <p className="mt-1 text-white">
                {selectedDetail.student_name ??
                  'Unknown student'}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Subject
              </p>

              <p className="mt-1 text-white">
                {selectedDetail.subject_name ??
                  'Unknown subject'}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Date
              </p>

              <p className="mt-1 text-white">
                {formatDate(
                  selectedDetail.date,
                )}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Period
              </p>

              <p className="mt-1 text-white">
                {formatTime(
                  selectedDetail.start_time,
                )}{' '}
                –{' '}
                {formatTime(
                  selectedDetail.end_time,
                )}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Duration
              </p>

              <p className="mt-1 text-white">
                {selectedDetail.duration_minutes}{' '}
                minutes
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Status
              </p>

              <span
                className={`mt-1 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                  selectedDetail.status,
                )}`}
              >
                {selectedDetail.status}
              </span>
            </div>

          </div>

          {selectedDetail.reason ? (
            <div className="mt-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Reason
              </p>

              <p className="mt-2 rounded-xl border border-slate-700 bg-slate-900 p-3 text-slate-100">
                {selectedDetail.reason}
              </p>
            </div>
          ) : null}

        </div>
      ) : null}

      {/* Attendance table */}
      <div className="card-surface overflow-hidden">

        {loading ? (
          <div className="p-6 text-slate-300">
            Loading attendance history...
          </div>
        ) : records.length === 0 ? (
          <div className="p-6 text-slate-300">
            No attendance records found for
            the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="min-w-full text-left text-sm">

              <thead className="border-b border-slate-800 bg-slate-900/60 text-slate-300">
                <tr>

                  <th className="px-4 py-3">
                    Date
                  </th>

                  <th className="px-4 py-3">
                    Student
                  </th>

                  <th className="px-4 py-3">
                    Subject
                  </th>

                  <th className="px-4 py-3">
                    Period
                  </th>

                  <th className="px-4 py-3">
                    Duration
                  </th>

                  <th className="px-4 py-3">
                    Status
                  </th>

                  <th className="px-4 py-3">
                    Details
                  </th>

                </tr>
              </thead>

              <tbody>

                {records.map(
                  (record) => (
                    <tr
                      key={record.id}
                      className="border-b border-slate-800 text-slate-100 hover:bg-slate-900/40"
                    >

                      <td className="px-4 py-3">
                        {formatDate(
                          record.date,
                        )}
                      </td>

                      <td className="px-4 py-3 font-medium">
                        {record.student_name ??
                          'Unknown student'}
                      </td>

                      <td className="px-4 py-3">
                        {record.subject_name ??
                          'Unknown subject'}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        {formatTime(
                          record.start_time,
                        )}{' '}
                        –{' '}
                        {formatTime(
                          record.end_time,
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {record.duration_minutes}{' '}
                        min
                      </td>

                      <td className="px-4 py-3">

                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                            record.status,
                          )}`}
                        >
                          {record.status}
                        </span>

                      </td>

                      <td className="px-4 py-3">

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedDetail(
                              record,
                            )
                          }
                          className="rounded-xl bg-sky-500 px-3 py-2 text-xs font-semibold text-slate-950"
                        >
                          View
                        </button>

                      </td>

                    </tr>
                  ),
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>

    </div>
  )
}