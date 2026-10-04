import { useState } from 'react'

const DEFAULT_THRESHOLD = 75

export function SettingsPage() {
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    const value = Number(threshold)

    if (!Number.isFinite(value) || value < 0 || value > 100) {
      return
    }

    setThreshold(value)
    setSaved(true)

    window.setTimeout(() => {
      setSaved(false)
    }, 2500)
  }

  return (
    <div className="space-y-6">
      <header className="card-surface p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-sky-300">
          Application preferences
        </p>

        <h2 className="mt-2 text-3xl font-bold text-white">
          Settings
        </h2>

        <p className="mt-2 text-slate-300">
          Manage attendance preferences and application settings.
        </p>
      </header>

      {saved ? (
        <div className="rounded-xl border border-emerald-500/60 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          Settings saved successfully.
        </div>
      ) : null}

      <section className="card-surface p-6">
        <div>
          <h3 className="text-xl font-semibold text-white">
            Attendance Settings
          </h3>

          <p className="mt-1 text-sm text-slate-400">
            Configure the minimum attendance percentage used to identify
            students who need attention.
          </p>
        </div>

        <div className="mt-6 max-w-md">
          <label
            htmlFor="attendance-threshold"
            className="block text-sm font-medium text-slate-200"
          >
            Attendance threshold
          </label>

          <div className="mt-2 flex items-center gap-3">
            <input
              id="attendance-threshold"
              type="number"
              min="0"
              max="100"
              step="1"
              value={threshold}
              onChange={(event) => {
                const value = Number(event.target.value)

                if (
                  Number.isFinite(value) &&
                  value >= 0 &&
                  value <= 100
                ) {
                  setThreshold(value)
                }
              }}
              className="w-32 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-400"
            />

            <span className="text-lg font-semibold text-slate-300">
              %
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-400">
            Students below this percentage will be shown as needing
            attention.
          </p>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
          >
            Save Settings
          </button>

          <span className="text-sm text-slate-400">
            Default: 75%
          </span>
        </div>
      </section>

      <section className="card-surface p-6">
        <h3 className="text-xl font-semibold text-white">
          Application Information
        </h3>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-slate-400">
              Application
            </p>

            <p className="mt-1 font-medium text-white">
              Attendance Tracker
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-400">
              Attendance rule
            </p>

            <p className="mt-1 font-medium text-white">
              Present / Conducted Periods
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-400">
              Default threshold
            </p>

            <p className="mt-1 font-medium text-white">
              75%
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-400">
              Data source
            </p>

            <p className="mt-1 font-medium text-white">
              Supabase / PostgreSQL
            </p>
          </div>
        </div>
      </section>

      <section className="card-surface p-6">
        <h3 className="text-xl font-semibold text-white">
          Configuration Pages
        </h3>

        <div className="mt-4 space-y-3 text-sm text-slate-300">
          <p>
            <span className="font-semibold text-white">
              Academic Config:
            </span>{' '}
            College, class, academic year, start date, working days and
            lunch timings.
          </p>

          <p>
            <span className="font-semibold text-white">
              Backup:
            </span>{' '}
            Export and restore students, subjects, timetable, academic
            days and attendance data.
          </p>
        </div>
      </section>
    </div>
  )
}