import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const DEFAULT_COLLEGE = 'ACHARYA NAGARJUNA UNIVERSITY'
const DEFAULT_CLASS = 'AIML-3/1'
const DEFAULT_YEAR = '2026-27'
const DEFAULT_START = '2026-09-16'
const DEFAULT_WORKING_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]
const DEFAULT_LUNCH_START = '12:30'
const DEFAULT_LUNCH_END = '13:30'

const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

export function AcademicConfigPage() {
  const [collegeName, setCollegeName] = useState(DEFAULT_COLLEGE)
  const [className, setClassName] = useState(DEFAULT_CLASS)
  const [academicYear, setAcademicYear] = useState(DEFAULT_YEAR)
  const [startDate, setStartDate] = useState(DEFAULT_START)
  const [workingDays, setWorkingDays] = useState<string[]>(DEFAULT_WORKING_DAYS)
  const [lunchStart, setLunchStart] = useState(DEFAULT_LUNCH_START)
  const [lunchEnd, setLunchEnd] = useState(DEFAULT_LUNCH_END)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        setError('')
        setSuccess('')

        const { data: groups, error: groupError } = await supabase
          .from('groups')
          .select(
            'id, college_name, class_name, academic_year, academic_start_date, working_days, lunch_start, lunch_end',
          )
          .limit(1)

        if (groupError) throw groupError

        const group = groups?.[0]

        if (!group) {
          throw new Error('No group is available to configure.')
        }

        setCollegeName(group.college_name || DEFAULT_COLLEGE)
        setClassName(group.class_name || DEFAULT_CLASS)
        setAcademicYear(group.academic_year || DEFAULT_YEAR)

        setStartDate(
          group.academic_start_date || DEFAULT_START,
        )

        setWorkingDays(
          Array.isArray(group.working_days) && group.working_days.length > 0
            ? group.working_days
            : DEFAULT_WORKING_DAYS,
        )

        setLunchStart(
          group.lunch_start
            ? String(group.lunch_start).slice(0, 5)
            : DEFAULT_LUNCH_START,
        )

        setLunchEnd(
          group.lunch_end
            ? String(group.lunch_end).slice(0, 5)
            : DEFAULT_LUNCH_END,
        )
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load academic configuration.',
        )
      }
    }

    void load()
  }, [])

  const toggleWorkingDay = (day: string) => {
    setWorkingDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day],
    )
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      if (!startDate) {
        throw new Error('Please select an academic start date.')
      }

      if (workingDays.length === 0) {
        throw new Error('Please select at least one working day.')
      }

      if (!lunchStart || !lunchEnd) {
        throw new Error('Please select both lunch start and lunch end times.')
      }

      if (lunchStart >= lunchEnd) {
        throw new Error('Lunch end time must be later than lunch start time.')
      }

      const { data: groups, error: groupError } = await supabase
        .from('groups')
        .select('id')
        .limit(1)

      if (groupError) throw groupError

      const group = groups?.[0]

      if (!group) {
        throw new Error('No group is available to configure.')
      }

      const { error: updateError } = await supabase
        .from('groups')
        .update({
          college_name: collegeName,
          class_name: className,
          academic_year: academicYear,
          academic_start_date: startDate,
          working_days: workingDays,
          lunch_start: lunchStart,
          lunch_end: lunchEnd,
        })
        .eq('id', group.id)

      if (updateError) throw updateError

      setSuccess('Academic configuration saved successfully.')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save academic configuration.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card-surface mx-auto max-w-2xl p-6">
      <p className="text-xs uppercase tracking-[0.22em] text-sky-300">
        Academic configuration
      </p>

      <h2 className="mt-3 text-3xl font-bold text-white">
        Configure class settings
      </h2>

      <div className="mt-6 space-y-4">
        <label className="block text-sm text-slate-300">
          College
          <input
            value={collegeName}
            onChange={(event) => setCollegeName(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white focus:border-sky-500"
          />
        </label>

        <label className="block text-sm text-slate-300">
          Class
          <input
            value={className}
            onChange={(event) => setClassName(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white focus:border-sky-500"
          />
        </label>

        <label className="block text-sm text-slate-300">
          Academic year
          <input
            value={academicYear}
            onChange={(event) => setAcademicYear(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white focus:border-sky-500"
          />
        </label>

        <label className="block text-sm text-slate-300">
          Academic start date
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white focus:border-sky-500"
          />
        </label>

        <div>
          <p className="text-sm text-slate-300">Working days</p>

          <div className="mt-2 flex flex-wrap gap-2">
            {DAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleWorkingDay(day)}
                className={`rounded-full px-3 py-2 text-sm font-medium ${
                  workingDays.includes(day)
                    ? 'bg-sky-500 text-slate-950'
                    : 'bg-slate-800 text-slate-200'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm text-slate-300">
            Lunch start
            <input
              type="time"
              value={lunchStart}
              onChange={(event) => setLunchStart(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white focus:border-sky-500"
            />
          </label>

          <label className="block text-sm text-slate-300">
            Lunch end
            <input
              type="time"
              value={lunchEnd}
              onChange={(event) => setLunchEnd(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white focus:border-sky-500"
            />
          </label>
        </div>

        {error ? (
          <p className="rounded-lg border border-red-500/60 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="rounded-lg border border-emerald-500/60 bg-emerald-500/10 p-3 text-sm text-emerald-200">
            {success}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl bg-sky-500 px-4 py-3 font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-70"
        >
          {saving ? 'Saving...' : 'Save configuration'}
        </button>
      </div>
    </div>
  )
}