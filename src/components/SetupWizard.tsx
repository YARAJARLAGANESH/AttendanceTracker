import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createDefaultGroupForUser } from '../hooks/useGroupSetup'

type SetupWizardProps = {
  onComplete?: () => void
}

const DEFAULT_COLLEGE = 'ACHARYA NAGARJUNA UNIVERSITY'
const DEFAULT_CLASS = 'AIML-3/1'
const DEFAULT_YEAR = '2026-27'

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const navigate = useNavigate()
  const [name, setName] = useState('AIML-3/1 Attendance')
  const [collegeName, setCollegeName] = useState(DEFAULT_COLLEGE)
  const [className, setClassName] = useState(DEFAULT_CLASS)
  const [academicYear, setAcademicYear] = useState(DEFAULT_YEAR)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')

    try {
      await createDefaultGroupForUser({
        name,
        college_name: collegeName,
        class_name: className,
        academic_year: academicYear,
      })

      onComplete?.()
      navigate('/students')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create the attendance group.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="card-surface mx-auto max-w-2xl p-6">
      <p className="text-xs uppercase tracking-[0.22em] text-sky-300">Academic setup</p>
      <h2 className="mt-3 text-3xl font-bold text-white">Create your attendance group</h2>

      <div className="mt-6 space-y-4">
        <label className="block text-sm text-slate-300">
          Group name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white focus:border-sky-500"
          />
        </label>

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

        {error ? <p className="rounded-lg border border-red-500/60 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full rounded-xl bg-sky-500 px-4 py-3 font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-70"
        >
          {submitting ? 'Creating group...' : 'Continue'}
        </button>
      </div>
    </div>
  )
}
