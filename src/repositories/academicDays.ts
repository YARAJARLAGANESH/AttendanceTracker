import { supabase } from '../lib/supabase'
import type { AcademicDay } from '../types/database'

export async function listAcademicDaysByGroup(groupId: string) {
  const { data, error } = await supabase
    .from('academic_days')
    .select('*')
    .eq('group_id', groupId)
    .order('date', { ascending: true })

  if (error) throw error
  return (data ?? []) as AcademicDay[]
}

export async function createAcademicDay(input: {
  group_id: string
  date: string
  day_type: AcademicDay['day_type']
  title?: string | null
  description?: string | null
}) {
  const { data, error } = await supabase.from('academic_days').insert(input).select('*').single()
  if (error) throw error
  return data as AcademicDay
}

export async function deleteAcademicDay(id: string) {
  const { error } = await supabase.from('academic_days').delete().eq('id', id)
  if (error) throw error
}
