import { useEffect, useState } from 'react'
import { SubjectForm } from '../components/SubjectForm'
import { supabase } from '../lib/supabase'
import type { Subject } from '../types/database'

export function SubjectManagementPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [groupId, setGroupId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const { data: groups, error: groupError } = await supabase.from('groups').select('*').limit(1)
        if (groupError) throw groupError

        const firstGroup = groups?.[0]
        if (!firstGroup) {
          setSubjects([])
          setLoading(false)
          return
        }

        setGroupId(firstGroup.id)

        const { data, error: subjectError } = await supabase.from('subjects').select('*').eq('group_id', firstGroup.id)
        if (subjectError) throw subjectError
        setSubjects((data ?? []) as Subject[])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load subjects.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const addSubject = async (values: { name: string; short_name?: string | null }) => {
    if (!groupId) {
      setError('No active group available.')
      return
    }

    try {
      const { data, error } = await supabase.from('subjects').insert({ group_id: groupId, ...values }).select('*').single()
      if (error) throw error
      setSubjects((current) => [...current, data as Subject])
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add subject.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="card-surface p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-sky-300">Subjects</p>
        <h2 className="mt-3 text-3xl font-bold text-white">Manage subject catalog</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="card-surface p-5">
          <h3 className="text-xl font-semibold text-white">Add subject</h3>
          <div className="mt-4">
            <SubjectForm onSubmit={addSubject} submitLabel="Add subject" />
          </div>
        </div>

        <div className="card-surface p-5">
          <h3 className="text-xl font-semibold text-white">Current subjects</h3>
          {loading ? <p className="mt-4 text-slate-300">Loading subjects...</p> : null}
          {error ? <p className="mt-3 rounded-lg border border-red-500/60 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}

          {!loading && subjects.length === 0 ? (
            <p className="mt-4 text-slate-300">No subjects are configured yet for this academic group.</p>
          ) : null}

          <div className="mt-4 space-y-3">
            {subjects.map((subject) => (
              <div key={subject.id} className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900 p-3">
                <div>
                  <p className="font-medium text-white">{subject.name}</p>
                  <p className="text-sm text-slate-300">{subject.short_name || 'No short name'}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs ${subject.is_active ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-700 text-slate-200'}`}>
                  {subject.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
