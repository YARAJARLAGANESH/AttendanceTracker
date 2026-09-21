import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { createTimetableEntry, deleteTimetableEntry, listTimetableByGroup, updateTimetableEntry } from '../repositories/timetable'
import type { Subject, TimetableEntry } from '../types/database'
import { isTimeRangeValid } from '../utils/schedule'

const DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

const initialForm = {
  id: '',
  day_of_week: 1,
  subject_id: '',
  start_time: '09:00',
  end_time: '10:00',
  active_from: '',
  active_until: '',
}

export function TimetablePage() {
  const [groupId, setGroupId] = useState<string | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState(initialForm)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)

        const { data: groups, error: groupError } = await supabase.from('groups').select('*').limit(1)
        if (groupError) throw groupError

        const currentGroup = groups?.[0]
        if (!currentGroup) {
          setSubjects([])
          setEntries([])
          setGroupId(null)
          return
        }

        setGroupId(currentGroup.id)

        const { data: subjectData, error: subjectError } = await supabase
          .from('subjects')
          .select('*')
          .eq('group_id', currentGroup.id)
          .eq('is_active', true)
        if (subjectError) throw subjectError

        const subjectRows = (subjectData ?? []) as Subject[]
        setSubjects(subjectRows)

        const timetableEntries = await listTimetableByGroup(currentGroup.id)
        setEntries(timetableEntries)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load timetable.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const handleSubmit = async () => {
    if (!groupId) {
      setError('A valid group must exist before creating a timetable entry.')
      return
    }

    if (!form.subject_id) {
      setError('Select a subject for the timetable entry.')
      return
    }

    if (!isTimeRangeValid(form.start_time, form.end_time)) {
      setError('The timetable entry must be a valid duration and cannot overlap lunch (12:30–13:30).')
      return
    }

    if (form.active_from && form.active_until && form.active_from > form.active_until) {
      setError('Active until must be on or after active from.')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const payload = {
        group_id: groupId,
        day_of_week: form.day_of_week,
        subject_id: form.subject_id,
        start_time: form.start_time,
        end_time: form.end_time,
        active_from: form.active_from || null,
        active_until: form.active_until || null,
      }

      if (form.id) {
        const updated = await updateTimetableEntry(form.id, payload)
        setEntries((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)))
        setSuccess('Timetable entry updated successfully.')
      } else {
        const created = await createTimetableEntry(payload)
        setEntries((current) => [...current, created].sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)))
        setSuccess('Timetable entry created successfully.')
      }

      setForm(initialForm)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save timetable entry.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Delete this timetable entry?')
    if (!confirmed) {
      return
    }

    try {
      await deleteTimetableEntry(id)
      setEntries((current) => current.filter((entry) => entry.id !== id))
      setSuccess('Timetable entry deleted.')
      setError('')
      if (form.id === id) {
        setForm(initialForm)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete timetable entry.')
    }
  }

  const startEdit = (entry: TimetableEntry) => {
    setForm({
      id: entry.id,
      day_of_week: entry.day_of_week,
      subject_id: entry.subject_id,
      start_time: entry.start_time,
      end_time: entry.end_time,
      active_from: entry.active_from ?? '',
      active_until: entry.active_until ?? '',
    })
    setError('')
    setSuccess('')
  }

  return (
    <div className="space-y-6">
      <div className="card-surface p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-sky-300">Timetable</p>
        <h2 className="mt-3 text-3xl font-bold text-white">Configure scheduled classes</h2>
        <p className="mt-3 text-sm text-slate-300">Labs remain a single logical class while the underlying hourly representation still supports attendance calculations.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <div className="card-surface p-5">
          <h3 className="text-xl font-semibold text-white">{form.id ? 'Edit timetable entry' : 'Add timetable entry'}</h3>

          <div className="mt-4 space-y-4">
            <label className="block text-sm text-slate-300">
              Subject
              <select
                value={form.subject_id}
                onChange={(event) => setForm((current) => ({ ...current, subject_id: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white focus:border-sky-500"
              >
                <option value="">Select a subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm text-slate-300">
              Day
              <select
                value={form.day_of_week}
                onChange={(event) => setForm((current) => ({ ...current, day_of_week: Number(event.target.value) }))}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white focus:border-sky-500"
              >
                {DAYS.map((day) => (
                  <option key={day.value} value={day.value}>{day.label}</option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm text-slate-300">
                Start time
                <input
                  type="time"
                  value={form.start_time}
                  onChange={(event) => setForm((current) => ({ ...current, start_time: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white focus:border-sky-500"
                />
              </label>

              <label className="block text-sm text-slate-300">
                End time
                <input
                  type="time"
                  value={form.end_time}
                  onChange={(event) => setForm((current) => ({ ...current, end_time: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white focus:border-sky-500"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm text-slate-300">
                Active from
                <input
                  type="date"
                  value={form.active_from}
                  onChange={(event) => setForm((current) => ({ ...current, active_from: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white focus:border-sky-500"
                />
              </label>

              <label className="block text-sm text-slate-300">
                Active until
                <input
                  type="date"
                  value={form.active_until}
                  onChange={(event) => setForm((current) => ({ ...current, active_until: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white focus:border-sky-500"
                />
              </label>
            </div>

            {error ? <p className="rounded-lg border border-red-500/60 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}
            {success ? <p className="rounded-lg border border-emerald-500/60 bg-emerald-500/10 p-3 text-sm text-emerald-200">{success}</p> : null}

            <div className="flex gap-3">
              <button type="button" onClick={handleSubmit} disabled={saving} className="flex-1 rounded-xl bg-sky-500 px-4 py-3 font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-70">
                {saving ? 'Saving...' : form.id ? 'Update entry' : 'Add entry'}
              </button>

              {form.id ? (
                <button type="button" onClick={() => setForm(initialForm)} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-medium text-slate-100">Cancel</button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="card-surface p-5">
          <h3 className="text-xl font-semibold text-white">Scheduled classes</h3>
          {loading ? <p className="mt-4 text-slate-300">Loading timetable...</p> : null}
          {!loading && entries.length === 0 ? <p className="mt-4 text-slate-300">No timetable entries exist yet for this group.</p> : null}

          <div className="mt-4 space-y-3">
            {entries.map((entry) => {
              const subject = subjects.find((item) => item.id === entry.subject_id)
              const dayLabel = DAYS.find((day) => day.value === entry.day_of_week)?.label ?? 'Unknown'

              return (
                <div key={entry.id} className="rounded-xl border border-slate-700 bg-slate-900 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{subject?.name ?? 'Unknown subject'}</p>
                      <p className="text-sm text-slate-300">{dayLabel} · {entry.start_time} – {entry.end_time}</p>
                      <p className="text-xs text-slate-400">{entry.active_from ?? 'No start'} → {entry.active_until ?? 'No end'}</p>
                    </div>

                    <div className="flex gap-2">
                      <button type="button" onClick={() => startEdit(entry)} className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100">Edit</button>
                      <button type="button" onClick={() => handleDelete(entry.id)} className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-200">Delete</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
