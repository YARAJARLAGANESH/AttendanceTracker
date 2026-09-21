import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { listAttendanceForGroup } from '../repositories/attendance'
import { listStudentsByGroup } from '../repositories/students'
import { listSubjectsByGroup } from '../repositories/subjects'
import type { AttendanceRecord, Student, Subject } from '../types/database'
import {
  buildLowAttendanceItems,
  buildMonthlyAttendance,
  buildOverallReportSummary,
  buildStudentAttendance,
  buildSubjectAttendance,
  buildWeeklyAttendance,
  filterAttendanceRecordsByRange,
} from '../utils/reports'

function formatPercentage(value: number | null) {
  if (value === null) return 'N/A'
  return `${value.toFixed(2)}%`
}

function statusLabel(value: number | null) {
  if (value === null) return 'N/A'
  if (value < 75) return 'Below 75%'
  return 'Normal'
}

export function ReportsPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError('')

        const { data: groups, error: groupError } = await supabase.from('groups').select('*').limit(1)
        if (groupError) throw groupError

        const group = groups?.[0]
        if (!group) {
          setRecords([])
          setSubjects([])
          setStudents([])
          return
        }

        const [attendanceData, subjectData, studentData] = await Promise.all([
          listAttendanceForGroup(group.id),
          listSubjectsByGroup(group.id),
          listStudentsByGroup(group.id),
        ])

        setRecords(attendanceData)
        setSubjects(subjectData)
        setStudents(studentData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load reports.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const filteredRecords = useMemo(() => {
    let nextRecords = filterAttendanceRecordsByRange(records, startDate, endDate)

    if (selectedSubject) {
      nextRecords = nextRecords.filter((record) => record.subject_id === selectedSubject)
    }

    if (selectedStudent) {
      nextRecords = nextRecords.filter((record) => record.student_id === selectedStudent)
    }

    return nextRecords
  }, [records, startDate, endDate, selectedSubject, selectedStudent])

  const summary = useMemo(() => buildOverallReportSummary(filteredRecords), [filteredRecords])
  const subjectRows = useMemo(() => buildSubjectAttendance(filteredRecords, subjects), [filteredRecords, subjects])
  const studentRows = useMemo(() => buildStudentAttendance(filteredRecords, students), [filteredRecords, students])
  const weeklyRows = useMemo(() => buildWeeklyAttendance(filteredRecords), [filteredRecords])
  const monthlyRows = useMemo(() => buildMonthlyAttendance(filteredRecords), [filteredRecords])
  const lowAttendance = useMemo(() => buildLowAttendanceItems([...subjectRows, ...studentRows]), [subjectRows, studentRows])

  const selectedStudentDetail = useMemo(() => {
    if (!selectedStudent) {
      return null
    }

    const student = students.find((item) => item.id === selectedStudent)
    if (!student) {
      return null
    }

    const studentRecords = filteredRecords.filter((record) => record.student_id === selectedStudent)
    const subjectBreakdown = buildSubjectAttendance(studentRecords, subjects)
    const studentSummary = buildStudentAttendance(studentRecords, [student])

    return {
      student,
      summary: studentSummary[0] ?? null,
      subjectBreakdown,
    }
  }, [filteredRecords, selectedStudent, students, subjects])

  const trendSeries = useMemo(() => {
    if (weeklyRows.length > 0) {
      return weeklyRows.map((row) => ({ label: `${row.startDate.slice(5)}`, value: row.percentage ?? 0 }))
    }

    if (monthlyRows.length > 0) {
      return monthlyRows.map((row) => ({ label: row.month.slice(5), value: row.percentage ?? 0 }))
    }

    return []
  }, [weeklyRows, monthlyRows])

  const maxTrendValue = Math.max(...trendSeries.map((item) => item.value), 100)

  return (
    <div className="space-y-6">
      <div className="card-surface p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-sky-300">Reports</p>
            <h2 className="mt-2 text-3xl font-bold text-white">Attendance analytics</h2>
            <p className="mt-2 text-sm text-slate-300">Review actual attendance records, subject performance, and below-threshold trends.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="text-sm text-slate-300">
              Start
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
            </label>
            <label className="text-sm text-slate-300">
              End
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
            </label>
            <label className="text-sm text-slate-300">
              Subject
              <select value={selectedSubject} onChange={(event) => setSelectedSubject(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">
                <option value="">All subjects</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-300">
              Student
              <select value={selectedStudent} onChange={(event) => setSelectedStudent(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">
                <option value="">All students</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>{student.name}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      {error ? <div className="rounded-xl border border-red-500/60 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}

      {loading ? (
        <div className="card-surface p-5 text-slate-300">Loading report data...</div>
      ) : null}

      {!loading && !error ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {[
              ['Overall %', formatPercentage(summary.percentage)],
              ['Conducted', `${summary.conducted}`],
              ['Present', `${summary.present}`],
              ['Absent', `${summary.absent}`],
              ['Below 75%', `${lowAttendance.length}`],
            ].map(([label, value]) => (
              <div key={label} className="card-surface p-5">
                <p className="text-sm text-slate-400">{label}</p>
                <p className="mt-3 text-2xl font-bold text-white">{value}</p>
                {label === 'Overall %' ? <p className="mt-2 text-xs text-slate-300">{statusLabel(summary.percentage)}</p> : null}
              </div>
            ))}
          </div>

          <div className="card-surface p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-semibold text-white">Attendance trend</h3>
              <span className="text-sm text-slate-300">{weeklyRows.length > 0 ? 'Weekly view' : 'Monthly view'}</span>
            </div>

            {trendSeries.length === 0 ? (
              <p className="mt-4 text-sm text-slate-300">No attendance data available for the selected range.</p>
            ) : (
              <div className="mt-5 flex h-48 items-end gap-2 overflow-x-auto">
                {trendSeries.map((item) => (
                  <div key={`${item.label}-${item.value}`} className="flex min-w-[52px] flex-1 flex-col items-center justify-end gap-2">
                    <span className="text-[10px] text-slate-400">{item.value.toFixed(0)}%</span>
                    <div className="w-full rounded-t-xl bg-sky-500/80" style={{ height: `${(item.value / maxTrendValue) * 100}%` }} />
                    <span className="text-[10px] text-slate-400">{item.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <div className="card-surface p-5">
              <h3 className="text-xl font-semibold text-white">Subject attendance</h3>
              {subjectRows.length === 0 ? (
                <p className="mt-4 text-sm text-slate-300">No subject attendance records found for the selected filters.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-slate-300">
                      <tr>
                        <th className="pb-2 pr-4">Subject</th>
                        <th className="pb-2 pr-4">Present</th>
                        <th className="pb-2 pr-4">Absent</th>
                        <th className="pb-2 pr-4">Conducted</th>
                        <th className="pb-2 pr-4">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjectRows.map((row) => (
                        <tr key={row.subjectId} className="border-t border-slate-800 text-slate-200">
                          <td className="py-3 pr-4">{row.subjectName}</td>
                          <td className="py-3 pr-4">{row.present}</td>
                          <td className="py-3 pr-4">{row.absent}</td>
                          <td className="py-3 pr-4">{row.conducted}</td>
                          <td className={`py-3 pr-4 ${row.warning ? 'text-amber-300' : 'text-emerald-300'}`}>{formatPercentage(row.percentage)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card-surface p-5">
              <h3 className="text-xl font-semibold text-white">Low attendance</h3>
              {lowAttendance.length === 0 ? (
                <p className="mt-4 text-sm text-slate-300">No low-attendance records found for the selected range.</p>
              ) : (
                <ul className="mt-4 space-y-3 text-sm text-slate-300">
                  {lowAttendance.map((item) => (
                    <li key={`${item.type}-${item.identifier}`} className="rounded-xl border border-slate-700 bg-slate-900 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span>{item.identifier}</span>
                        <span className="text-amber-300">{formatPercentage(item.percentage)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="card-surface p-5">
              <h3 className="text-xl font-semibold text-white">Weekly attendance</h3>
              {weeklyRows.length === 0 ? (
                <p className="mt-4 text-sm text-slate-300">No weekly attendance data for the selected range.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-slate-300">
                      <tr>
                        <th className="pb-2 pr-4">Week</th>
                        <th className="pb-2 pr-4">Conducted</th>
                        <th className="pb-2 pr-4">Present</th>
                        <th className="pb-2 pr-4">Absent</th>
                        <th className="pb-2 pr-4">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyRows.map((row) => (
                        <tr key={`${row.startDate}-${row.endDate}`} className="border-t border-slate-800 text-slate-200">
                          <td className="py-3 pr-4">{row.startDate}–{row.endDate}</td>
                          <td className="py-3 pr-4">{row.conducted}</td>
                          <td className="py-3 pr-4">{row.present}</td>
                          <td className="py-3 pr-4">{row.absent}</td>
                          <td className={`${row.warning ? 'text-amber-300' : 'text-emerald-300'} py-3 pr-4`}>{formatPercentage(row.percentage)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card-surface p-5">
              <h3 className="text-xl font-semibold text-white">Monthly attendance</h3>
              {monthlyRows.length === 0 ? (
                <p className="mt-4 text-sm text-slate-300">No monthly attendance data for the selected range.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-slate-300">
                      <tr>
                        <th className="pb-2 pr-4">Month</th>
                        <th className="pb-2 pr-4">Conducted</th>
                        <th className="pb-2 pr-4">Present</th>
                        <th className="pb-2 pr-4">Absent</th>
                        <th className="pb-2 pr-4">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyRows.map((row) => (
                        <tr key={row.month} className="border-t border-slate-800 text-slate-200">
                          <td className="py-3 pr-4">{row.month}</td>
                          <td className="py-3 pr-4">{row.conducted}</td>
                          <td className="py-3 pr-4">{row.present}</td>
                          <td className="py-3 pr-4">{row.absent}</td>
                          <td className={`${row.warning ? 'text-amber-300' : 'text-emerald-300'} py-3 pr-4`}>{formatPercentage(row.percentage)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="card-surface p-5">
            <h3 className="text-xl font-semibold text-white">Student attendance</h3>
            {studentRows.length === 0 ? (
              <p className="mt-4 text-sm text-slate-300">No student attendance data for the selected filters.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-slate-300">
                    <tr>
                      <th className="pb-2 pr-4">Student</th>
                      <th className="pb-2 pr-4">Present</th>
                      <th className="pb-2 pr-4">Absent</th>
                      <th className="pb-2 pr-4">Conducted</th>
                      <th className="pb-2 pr-4">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentRows.map((row) => (
                      <tr key={row.studentId} className="border-t border-slate-800 text-slate-200">
                        <td className="py-3 pr-4">
                          <button type="button" onClick={() => setSelectedStudent(row.studentId)} className="text-left text-sky-300 underline-offset-2 hover:underline">
                            {row.studentName}
                          </button>
                        </td>
                        <td className="py-3 pr-4">{row.present}</td>
                        <td className="py-3 pr-4">{row.absent}</td>
                        <td className="py-3 pr-4">{row.conducted}</td>
                        <td className={`${row.warning ? 'text-amber-300' : 'text-emerald-300'} py-3 pr-4`}>{formatPercentage(row.percentage)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {selectedStudentDetail ? (
            <div className="card-surface p-5">
              <h3 className="text-xl font-semibold text-white">Student detail</h3>
              <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-white">{selectedStudentDetail.student.name}</p>
                    <p className="text-sm text-slate-300">{selectedStudentDetail.summary ? `${formatPercentage(selectedStudentDetail.summary.percentage)} overall` : 'No summary available'}</p>
                  </div>
                  <button type="button" onClick={() => setSelectedStudent('')} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">Clear selection</button>
                </div>
              </div>

              {selectedStudentDetail.subjectBreakdown.length === 0 ? (
                <p className="mt-4 text-sm text-slate-300">No subject breakdown for this student in the selected range.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-slate-300">
                      <tr>
                        <th className="pb-2 pr-4">Subject</th>
                        <th className="pb-2 pr-4">Present</th>
                        <th className="pb-2 pr-4">Absent</th>
                        <th className="pb-2 pr-4">Conducted</th>
                        <th className="pb-2 pr-4">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedStudentDetail.subjectBreakdown.map((row) => (
                        <tr key={row.subjectId} className="border-t border-slate-800 text-slate-200">
                          <td className="py-3 pr-4">{row.subjectName}</td>
                          <td className="py-3 pr-4">{row.present}</td>
                          <td className="py-3 pr-4">{row.absent}</td>
                          <td className="py-3 pr-4">{row.conducted}</td>
                          <td className={`${row.warning ? 'text-amber-300' : 'text-emerald-300'} py-3 pr-4`}>{formatPercentage(row.percentage)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
