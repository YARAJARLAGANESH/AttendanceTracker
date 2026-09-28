import { useState } from 'react'

type SubjectFormProps = {
  initialValues?: {
    name: string
    short_name?: string | null
  }
  onSubmit: (values: { name: string; short_name?: string | null }) => Promise<void> | void
  submitLabel?: string
  loading?: boolean
}

export function SubjectForm({ initialValues, onSubmit, submitLabel = 'Save subject', loading = false }: SubjectFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '')
  const [shortName, setShortName] = useState(initialValues?.short_name ?? '')
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    const cleanName = name.trim()
    if (!cleanName) {
      setError('Subject name is required.')
      return
    }

    setError('')
    await onSubmit({
      name: cleanName,
      short_name: shortName.trim() || null,
    })
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm text-slate-300">
        Subject name
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white focus:border-sky-500"
          placeholder="Cloud Computing"
        />
      </label>

      <label className="block text-sm text-slate-300">
        Short name
        <input
          value={shortName}
          onChange={(event) => setShortName(event.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white focus:border-sky-500"
          placeholder="CC"
        />
      </label>

      {error ? <p className="rounded-lg border border-red-500/60 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-70"
      >
        {loading ? 'Saving...' : submitLabel}
      </button>
    </div>
  )
}
