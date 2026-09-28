import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { listGroupsForCurrentUser } from '../repositories/groups'

type SetupStatus = {
  loading: boolean
  groups: Array<{ id: string; name: string; class_name: string; college_name: string; academic_year: string }>
  needsSetup: boolean
  error: string | null
}

export function useGroupSetup() {
  const [state, setState] = useState<SetupStatus>({
    loading: true,
    groups: [],
    needsSetup: false,
    error: null,
  })

  useEffect(() => {
    const load = async () => {
      try {
        const groups = await listGroupsForCurrentUser()
        setState({
          loading: false,
          groups,
          needsSetup: groups.length === 0,
          error: null,
        })
      } catch (error) {
        setState({
          loading: false,
          groups: [],
          needsSetup: false,
          error: error instanceof Error ? error.message : 'Unable to load groups.',
        })
      }
    }

    void load()
  }, [])

  return useMemo(() => state, [state])
}

export async function createDefaultGroupForUser(input: {
  name: string
  college_name: string
  class_name: string
  academic_year: string
}) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('You must be signed in to create a group.')
  }

  const { data, error } = await supabase
    .from('groups')
    .insert({
      ...input,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}
