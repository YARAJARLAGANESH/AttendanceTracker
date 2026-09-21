export function AttendancePage() {
  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-sky-300">September 21, 2026</p>
          <h2 className="mt-2 text-3xl font-bold text-white">Monday</h2>
        </div>
        <button type="button" className="rounded-xl bg-sky-500 px-4 py-2 font-semibold text-slate-950">Mark all present</button>
      </header>

      <div className="space-y-4">
        {[
          { time: '09:30 – 10:30', subject: 'Computer Networks' },
          { time: '10:30 – 11:30', subject: 'Software Engineering' },
          { time: '13:30 – 16:30', subject: 'ML Lab · 3 hours' },
        ].map(({ time, subject }) => (
          <div key={subject} className="card-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-400">{time}</p>
                <h3 className="mt-2 text-xl font-semibold text-white">{subject}</h3>
              </div>
              <div className="flex gap-2">
                <button type="button" className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950">Present</button>
                <button type="button" className="rounded-xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white">Absent</button>
                <button type="button" className="rounded-xl bg-slate-700 px-4 py-3 text-sm font-semibold text-slate-100">Not Conducted</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
