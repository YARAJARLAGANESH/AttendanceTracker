import { supabase } from '../lib/supabase'
import type { Subject } from '../types/database'

export async function listSubjectsByGroup(groupId: string) {
  const { data, error } = await supabase.from('subjects').select('*').eq('group_id', groupId)
  if (error) throw error
  return (data ?? []) as Subject[]
}

export async function createSubject(input: {
  group_id: string
  name: string
  short_name?: string | null
  is_active?: boolean
}) {
  const { data, error } = await supabase.from('subjects').insert(input).select('*').single()
  if (error) throw error
  return data as Subject
}

export async function seedDefaultSubjectsForGroup(groupId: string) {
  const { error } = await supabase.rpc('seed_default_subjects_for_group', { p_group_id: groupId })
  if (error) throw error
}
