import { supabase } from '../lib/supabase'
import type { Student } from '../types/database'

export async function listStudentsByGroup(groupId: string) {
  const { data, error } = await supabase.from('students').select('*').eq('group_id', groupId)
  if (error) throw error
  return (data ?? []) as Student[]
}

export async function createStudent(input: {
  group_id: string
  user_id?: string | null
  name: string
  roll_number?: string | null
}) {
  const { data, error } = await supabase.from('students').insert(input).select('*').single()
  if (error) throw error
  return data as Student
}

export async function updateStudent(studentId: string, updates: Partial<Omit<Student, 'id' | 'created_at'>>) {
  const { data, error } = await supabase.from('students').update(updates).eq('id', studentId).select('*').single()
  if (error) throw error
  return data as Student
}
