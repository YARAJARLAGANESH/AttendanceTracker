import { useState } from 'react'

type StudentFormProps = {
  initialValues?: {
    name: string
    roll_number?: string | null
    user_id?: string | null
  }
  onSubmit: (values: { name: string; roll_number?: string | null; user_id?: string | null }) => Promise<void> | void
  submitLabel?: string
  loading?: boolean
}

export function StudentForm({ initialValues, onSubmit, submitLabel = 'Save student', loading = false }: StudentFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '')
  const [rollNumber, setRollNumber] = useState(initialValues?.roll_number ?? '')
  const [userId, setUserId] = useState(initialValues?.user_id ?? '')
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    const cleanName = name.trim()
    if (!cleanName) {
      setError('Student name is required.')
      return
    }

    setError('')
    await onSubmit({
      name: cleanName,
      roll_number: rollNumber.trim() || null,
      user_id: userId.trim() || null,
    })
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm text-slate-300">
        Student name
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white focus:border-sky-500"
          placeholder="Ravi"
        />
      </label>

      <label className="block text-sm text-slate-300">
        Roll number
        <input
          value={rollNumber}
          onChange={(event) => setRollNumber(event.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white focus:border-sky-500"
          placeholder="21A01"
        />
      </label>

      <label className="block text-sm text-slate-300">
        Linked user id (optional)
        <input
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white focus:border-sky-500"
          placeholder="user UUID"
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
