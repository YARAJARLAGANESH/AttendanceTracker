import { useEffect, useState } from 'react'
import { createAcademicDay, deleteAcademicDay, listAcademicDaysByGroup } from '../repositories/academicDays'
import { supabase } from '../lib/supabase'
import type { AcademicDay } from '../types/database'

const DAY_TYPES = ['NORMAL', 'HOLIDAY', 'SPECIAL_CLASS', 'EXAM', 'COLLEGE_EVENT'] as const

export function CalendarPage() {
  const [groupId, setGroupId] = useState<string | null>(null)
  const [days, setDays] = useState<AcademicDay[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({
    date: '',
    day_type: 'HOLIDAY' as AcademicDay['day_type'],
    title: '',
    description: '',
  })

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const { data: groups, error: groupError } = await supabase.from('groups').select('*').limit(1)
        if (groupError) throw groupError

        const currentGroup = groups?.[0]
        if (!currentGroup) {
          setDays([])
          setGroupId(null)
          return
        }

        setGroupId(currentGroup.id)
        const academicDays = await listAcademicDaysByGroup(currentGroup.id)
        setDays(academicDays)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load academic calendar.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const handleSubmit = async () => {
    if (!groupId || !form.date) {
      setError('Select a date before saving the academic day.')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const created = await createAcademicDay({
        group_id: groupId,
        date: form.date,
        day_type: form.day_type,
        title: form.title.trim() || null,
        description: form.description.trim() || null,
      })

      setDays((current) => [...current, created].sort((a, b) => a.date.localeCompare(b.date)))
      setForm({ date: '', day_type: 'HOLIDAY', title: '', description: '' })
      setSuccess('Academic day saved successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save academic day.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteAcademicDay(id)
      setDays((current) => current.filter((item) => item.id !== id))
      setSuccess('Academic day removed.')
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to remove academic day.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="card-surface p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-sky-300">Academic calendar</p>
        <h2 className="mt-3 text-3xl font-bold text-white">Working days, holidays, and special dates</h2>
        <p className="mt-3 text-sm text-slate-300">Baseline: Monday–Saturday are working days, Sunday is non-working, and lunch is 12:30–13:30.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <div className="card-surface p-5">
          <h3 className="text-xl font-semibold text-white">Add academic day</h3>

          <div className="mt-4 space-y-4">
            <label className="block text-sm text-slate-300">
              Date
              <input
                type="date"
                value={form.date}
                onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white focus:border-sky-500"
              />
            </label>

            <label className="block text-sm text-slate-300">
              Type
              <select
                value={form.day_type}
                onChange={(event) => setForm((current) => ({ ...current, day_type: event.target.value as AcademicDay['day_type'] }))}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white focus:border-sky-500"
              >
                {DAY_TYPES.map((dayType) => (
                  <option key={dayType} value={dayType}>{dayType}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm text-slate-300">
              Title
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white focus:border-sky-500"
                placeholder="Holiday name or reason"
              />
            </label>

            <label className="block text-sm text-slate-300">
              Description
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                className="mt-1 min-h-28 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white focus:border-sky-500"
                placeholder="Optional details"
              />
            </label>

            {error ? <p className="rounded-lg border border-red-500/60 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}
            {success ? <p className="rounded-lg border border-emerald-500/60 bg-emerald-500/10 p-3 text-sm text-emerald-200">{success}</p> : null}

            <button type="button" onClick={handleSubmit} disabled={saving || !form.date} className="w-full rounded-xl bg-sky-500 px-4 py-3 font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-70">
              {saving ? 'Saving...' : 'Save academic day'}
            </button>
          </div>
        </div>

        <div className="card-surface p-5">
          <h3 className="text-xl font-semibold text-white">Calendar entries</h3>
          {loading ? <p className="mt-4 text-slate-300">Loading academic calendar...</p> : null}
          {!loading && days.length === 0 ? <p className="mt-4 text-slate-300">No academic-day exceptions are configured yet.</p> : null}

          <div className="mt-4 space-y-3">
            {days.map((day) => (
              <div key={day.id} className="rounded-xl border border-slate-700 bg-slate-900 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{day.date}</p>
                    <p className="text-sm text-sky-300">{day.day_type}</p>
                    {day.title ? <p className="mt-1 text-sm text-slate-200">{day.title}</p> : null}
                    {day.description ? <p className="mt-1 text-sm text-slate-400">{day.description}</p> : null}
                  </div>

                  <button type="button" onClick={() => handleDelete(day.id)} className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-200">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
