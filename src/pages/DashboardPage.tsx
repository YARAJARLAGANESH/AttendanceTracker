import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { listAttendanceForGroup } from '../repositories/attendance'
import { listSubjectsByGroup } from '../repositories/subjects'
import type { AttendanceRecord, Subject } from '../types/database'
import { buildOverallAttendanceSummary, buildSubjectPerformance, type OverallAttendanceSummary } from '../utils/analytics'
import { buildRecentAttendance } from '../utils/dashboard'

function formatPercentage(value: number | null) {
  if (value === null) return 'N/A'
  return `${value.toFixed(2)}%`
}

function isWithinDateRange(dateString: string, days: number) {
  const target = new Date(`${dateString}T00:00:00`)
  const now = new Date()
  const diffDays = (now.getTime() - target.getTime()) / 86400000
  return diffDays >= 0 && diffDays <= days
}

function getStatusTone(status: AttendanceRecord['status']) {
  switch (status) {
    case 'PRESENT':
      return 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/40'
    case 'ABSENT':
      return 'bg-rose-500/15 text-rose-200 border border-rose-500/40'
    case 'NOT_CONDUCTED':
      return 'bg-amber-500/15 text-amber-200 border border-amber-500/40'
    default:
      return 'bg-slate-700 text-slate-200 border border-slate-600'
  }
}

export function DashboardPage() {
  const [groupName, setGroupName] = useState('')
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError('')

        const { data: groups, error: groupError } = await supabase.from('groups').select('*').limit(1)
        if (groupError) throw groupError

        const group = groups?.[0]
        if (!group) {
          setGroupName('')
          setRecords([])
          setSubjects([])
          return
        }

        setGroupName(group.name)

        const [attendanceData, subjectData] = await Promise.all([
          listAttendanceForGroup(group.id),
          listSubjectsByGroup(group.id),
        ])

        setRecords(attendanceData)
        setSubjects(subjectData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load dashboard analytics.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const subjectPerformance = useMemo(() => buildSubjectPerformance(records, subjects), [records, subjects])
  const overallSummary = useMemo<OverallAttendanceSummary>(() => buildOverallAttendanceSummary(records), [records])
  const recentAttendance = useMemo(() => buildRecentAttendance(records, subjects, 5), [records, subjects])

  const monthSummary = useMemo(() => {
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    const filtered = records.filter((record) => {
      const date = new Date(`${record.date}T00:00:00`)
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear
    })

    return buildOverallAttendanceSummary(filtered)
  }, [records])

  const weekSummary = useMemo(() => {
    const filtered = records.filter((record) => isWithinDateRange(record.date, 7))
    return buildOverallAttendanceSummary(filtered)
  }, [records])

  const lowPerformingSubjects = useMemo(
    () => subjectPerformance.filter((item) => item.percentage !== null && item.percentage < 75).length,
    [subjectPerformance],
  )

  const latestSubjects = useMemo(() => subjectPerformance.slice(0, 4), [subjectPerformance])

  const hasSetup = Boolean(groupName || subjects.length > 0 || records.length > 0)

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-sky-300">ACHARYA NAGARJUNA UNIVERSITY</p>
          <h2 className="mt-2 text-3xl font-bold text-white">{groupName || 'Class overview'}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/attendance" className="rounded-xl bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950">Mark Attendance</Link>
          <Link to="/students" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-100">Students</Link>
          <Link to="/subjects" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-100">Subjects</Link>
          <Link to="/timetable" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-100">Timetable</Link>
        </div>
      </header>

      {error ? <div className="rounded-xl border border-red-500/60 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}

      {!loading && !hasSetup ? (
        <div className="card-surface p-6">
          <h3 className="text-xl font-semibold text-white">No setup yet</h3>
          <p className="mt-2 text-slate-300">Create a group and configure students, subjects, and timetable data to begin tracking attendance.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/setup" className="rounded-xl bg-sky-500 px-4 py-2 font-semibold text-slate-950">Go to setup</Link>
          </div>
        </div>
      ) : null}

      {!loading && hasSetup ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ['Overall Attendance', formatPercentage(overallSummary.percentage), overallSummary.warning ? 'warning' : 'stable'],
              ['This Week', formatPercentage(weekSummary.percentage), weekSummary.warning ? 'warning' : 'good'],
              ['This Month', formatPercentage(monthSummary.percentage), monthSummary.warning ? 'warning' : 'good'],
              ['Subjects Below 75%', `${lowPerformingSubjects} ${lowPerformingSubjects > 0 ? '⚠️' : ''}`, lowPerformingSubjects > 0 ? 'warning' : 'stable'],
            ].map(([label, value, tone]) => (
              <div key={label} className="card-surface p-5">
                <p className="text-sm text-slate-400">{label}</p>
                <p className={`mt-3 text-3xl font-bold ${tone === 'warning' ? 'text-amber-400' : 'text-white'}`}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <div className="card-surface p-5">
              <h3 className="text-xl font-semibold text-white">Subject overview</h3>

              {loading ? <p className="mt-4 text-slate-300">Loading attendance analytics...</p> : null}

              {!loading && latestSubjects.length === 0 ? (
                <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-300">
                  No attendance records are available yet. Start by recording attendance for a scheduled class.
                </div>
              ) : null}

              {!loading && latestSubjects.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {latestSubjects.map((item) => (
                    <div key={item.subjectId} className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-slate-400">{item.subjectName}</p>
                          <p className="mt-1 font-medium text-white">{formatPercentage(item.percentage)}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.warning ? 'bg-amber-500/15 text-amber-200' : 'bg-emerald-500/15 text-emerald-200'}`}>
                          {item.warning ? 'Below threshold' : 'On track'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="card-surface p-5">
              <h3 className="text-xl font-semibold text-white">Recent attendance</h3>

              {!loading && recentAttendance.length === 0 ? (
                <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-300">
                  No attendance history yet. Use the attendance workflow to record the first session.
                </div>
              ) : null}

              {!loading && recentAttendance.length > 0 ? (
                <ul className="mt-4 space-y-3 text-sm text-slate-300">
                  {recentAttendance.map((item) => (
                    <li key={`${item.date}-${item.subjectId}-${item.start_time}`} className="rounded-xl border border-slate-700 bg-slate-900 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{item.subjectName}</p>
                          <p className="mt-1 text-xs text-slate-400">{item.date} · {item.start_time} – {item.end_time}</p>
                        </div>
                        <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${getStatusTone(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
