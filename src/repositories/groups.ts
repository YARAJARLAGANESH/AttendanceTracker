import { supabase } from '../lib/supabase'
import type { Group, GroupMember, UserRole } from '../types/database'
import { assertValidGroupRole } from './validation'

export async function listGroupsForCurrentUser() {
  const { data, error } = await supabase.from('groups').select('*')
  if (error) throw error
  return (data ?? []) as Group[]
}

export async function getGroupById(groupId: string) {
  const { data, error } = await supabase.from('groups').select('*').eq('id', groupId).maybeSingle()
  if (error) throw error
  return data as Group | null
}

export async function createGroup(input: {
  name: string
  college_name: string
  class_name: string
  academic_year: string
  created_by: string
}) {
  const { data, error } = await supabase.from('groups').insert(input).select('*').single()
  if (error) throw error
  return data as Group
}

export async function listGroupMembers(groupId: string) {
  const { data, error } = await supabase.from('group_members').select('*').eq('group_id', groupId)
  if (error) throw error
  return (data ?? []) as GroupMember[]
}

export async function addGroupMember(groupId: string, userId: string, role: UserRole = 'member') {
  assertValidGroupRole(role)

  const { data, error } = await supabase
    .from('group_members')
    .insert({ group_id: groupId, user_id: userId, role })
    .select('*')
    .single()

  if (error) throw error
  return data as GroupMember
}
