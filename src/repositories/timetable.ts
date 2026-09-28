import { supabase } from '../lib/supabase'
import type { TimetableEntry } from '../types/database'
import { validateTimetableEntry } from '../utils/schedule'

export async function listTimetableByGroup(groupId: string) {
  const { data, error } = await supabase
    .from('timetable')
    .select('*')
    .eq('group_id', groupId)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) throw error
  return (data ?? []) as TimetableEntry[]
}

export async function createTimetableEntry(input: {
  group_id: string
  day_of_week: number
  subject_id: string
  start_time: string
  end_time: string
  class_group_id?: string | null
  active_from?: string | null
  active_until?: string | null
}) {
  const validation = validateTimetableEntry(input)
  if (!validation.valid) {
    throw new Error(validation.errors.join(' '))
  }

  const { data, error } = await supabase.from('timetable').insert(input).select('*').single()
  if (error) throw error
  return data as TimetableEntry
}

export async function updateTimetableEntry(id: string, input: Partial<TimetableEntry>) {
  const validation = validateTimetableEntry({ ...input, group_id: input.group_id ?? undefined })
  if (!validation.valid) {
    throw new Error(validation.errors.join(' '))
  }

  const { data, error } = await supabase.from('timetable').update(input).eq('id', id).select('*').single()
  if (error) throw error
  return data as TimetableEntry
}

export async function deleteTimetableEntry(id: string) {
  const { error } = await supabase.from('timetable').delete().eq('id', id)
  if (error) throw error
}
