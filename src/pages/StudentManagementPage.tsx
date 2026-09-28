import { useEffect, useMemo, useState } from 'react'
import { StudentForm } from '../components/StudentForm'
import { supabase } from '../lib/supabase'
import type { Student } from '../types/database'

export function StudentManagementPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [groupName, setGroupName] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const { data: groups, error: groupError } = await supabase.from('groups').select('*').limit(1)
        if (groupError) throw groupError

        const firstGroup = groups?.[0]
        if (!firstGroup) {
          setStudents([])
          setLoading(false)
          return
        }

        setActiveGroupId(firstGroup.id)
        setGroupName(firstGroup.name)

        const { data, error: studentError } = await supabase.from('students').select('*').eq('group_id', firstGroup.id)
        if (studentError) throw studentError
        setStudents((data ?? []) as Student[])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load students.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const studentList = useMemo(() => students, [students])

  const addStudent = async (values: { name: string; roll_number?: string | null; user_id?: string | null }) => {
    if (!activeGroupId) {
      setError('No active group available.')
      return
    }

    try {
      const { data, error: insertError } = await supabase
        .from('students')
        .insert({
          group_id: activeGroupId,
          ...values,
        })
        .select('*')
        .single()

      if (insertError) throw insertError
      setStudents((current) => [...current, data as Student])
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add student.')
    }
  }

  const removeStudent = async (studentId: string) => {
    try {
      const { error } = await supabase.from('students').delete().eq('id', studentId)
      if (error) throw error
      setStudents((current) => current.filter((student) => student.id !== studentId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to remove student.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="card-surface p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-sky-300">Students</p>
        <h2 className="mt-3 text-3xl font-bold text-white">{groupName || 'Student management'}</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
        <div className="card-surface p-5">
          <h3 className="text-xl font-semibold text-white">Add student</h3>
          <div className="mt-4">
            <StudentForm onSubmit={addStudent} submitLabel="Add student" />
          </div>
        </div>

        <div className="card-surface p-5">
          <h3 className="text-xl font-semibold text-white">Current students</h3>
          {loading ? <p className="mt-4 text-slate-300">Loading students...</p> : null}
          {error ? <p className="mt-3 rounded-lg border border-red-500/60 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}

          {!loading && studentList.length === 0 ? (
            <p className="mt-4 text-slate-300">No students yet. Add the first student to begin configuration.</p>
          ) : null}

          <div className="mt-4 space-y-3">
            {studentList.map((student) => (
              <div key={student.id} className="rounded-xl border border-slate-700 bg-slate-900 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{student.name}</p>
                    <p className="text-sm text-slate-300">{student.roll_number || 'No roll number'}</p>
                  </div>
                  <button type="button" onClick={() => removeStudent(student.id)} className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-200">Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
