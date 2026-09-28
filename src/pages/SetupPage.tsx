import { useMemo } from 'react'
import { SetupWizard } from '../components/SetupWizard'
import { useGroupSetup } from '../hooks/useGroupSetup'

export function SetupPage() {
  const { loading, groups, needsSetup, error } = useGroupSetup()

  const summary = useMemo(
    () => ({
      hasGroups: groups.length > 0,
      currentGroup: groups[0] ?? null,
    }),
    [groups],
  )

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        Loading setup...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="card-surface max-w-lg p-6 text-center">
          <h2 className="text-2xl font-bold text-white">Setup unavailable</h2>
          <p className="mt-3 text-slate-300">{error}</p>
        </div>
      </div>
    )
  }

  if (needsSetup) {
    return <SetupWizard onComplete={() => undefined} />
  }

  return (
    <div className="space-y-6">
      <div className="card-surface p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-sky-300">Attendance environment</p>
        <h2 className="mt-3 text-3xl font-bold text-white">Your group is ready</h2>
        <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900 p-4">
          <p className="text-sm text-slate-400">Current group</p>
          <p className="mt-2 text-xl font-semibold text-white">{summary.currentGroup?.name}</p>
          <p className="text-sm text-slate-300">{summary.currentGroup?.college_name}</p>
          <p className="text-sm text-slate-300">{summary.currentGroup?.class_name}</p>
        </div>
      </div>

      <div className="card-surface p-6">
        <h3 className="text-xl font-semibold text-white">Setup status</h3>
        <ul className="mt-4 space-y-3 text-sm text-slate-300">
          <li>• Group/class configured</li>
          <li>• Student management available</li>
          <li>• Subject management available</li>
          <li>• Academic configuration available</li>
        </ul>
      </div>
    </div>
  )
}
