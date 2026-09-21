import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { listAttendanceForGroup } from '../repositories/attendance'
import { listSubjectsByGroup } from '../repositories/subjects'
import type { AttendanceRecord, Subject } from '../types/database'
import { buildOverallAttendanceSummary, buildSubjectPerformance } from '../utils/analytics'

function formatPercentage(value: number | null) {
  if (value === null) return 'N/A'
  return `${value.toFixed(2)}%`
}

export function ReportsPage() {
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
          setRecords([])
          setSubjects([])
          return
        }

        const [attendanceData, subjectData] = await Promise.all([
          listAttendanceForGroup(group.id),
          listSubjectsByGroup(group.id),
        ])

        setRecords(attendanceData)
        setSubjects(subjectData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load reports.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const summary = useMemo(() => buildOverallAttendanceSummary(records), [records])
  const subjectSummary = useMemo(() => buildSubjectPerformance(records, subjects), [records, subjects])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        {['Weekly', 'Monthly', 'Subject', 'Overall'].map((label) => (
          <button type="button" key={label} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100">
            {label}
          </button>
        ))}
      </div>

      {error ? <div className="rounded-xl border border-red-500/60 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}

      <div className="card-surface p-5">
        <h2 className="text-2xl font-bold text-white">Overall attendance</h2>
        <p className="mt-3 text-3xl font-bold text-white">{formatPercentage(summary.percentage)}</p>
        <p className="mt-2 text-sm text-slate-300">
          {summary.conductedMinutes} conducted minutes · {summary.presentMinutes} present minutes
        </p>
      </div>

      <div className="card-surface p-5">
        <h2 className="text-2xl font-bold text-white">Subject performance</h2>

        {loading ? <p className="mt-5 text-sm text-slate-300">Loading subject analytics...</p> : null}

        {!loading && subjectSummary.length === 0 ? (
          <p className="mt-5 text-sm text-slate-300">No attendance records are available for this group yet.</p>
        ) : null}

        {!loading && subjectSummary.length > 0 ? (
          <div className="mt-5 space-y-3 text-sm text-slate-300">
            {subjectSummary.map((item) => (
              <div key={item.subjectId} className="rounded-xl border border-slate-700 bg-slate-900 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span>{item.subjectName}</span>
                  <span className={item.warning ? 'text-amber-300' : 'text-emerald-300'}>{formatPercentage(item.percentage)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
