export function DashboardPage() {
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-sky-300">ACHARYA NAGARJUNA UNIVERSITY</p>
          <h2 className="mt-2 text-3xl font-bold text-white">AIML-3/1</h2>
        </div>
        <div className="rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.16em] text-sky-200">Good morning</p>
          <p className="text-lg font-semibold text-white">Ravi 👋</p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Overall Attendance', '84.62%', 'stable'],
          ['This Week', '88.24%', 'good'],
          ['This Month', '84.91%', 'good'],
          ['Subjects Below 75%', '2 ⚠️', 'warning'],
        ].map(([label, value, tone]) => (
          <div key={label} className="card-surface p-5">
            <p className="text-sm text-slate-400">{label}</p>
            <p className={`mt-3 text-3xl font-bold ${tone === 'warning' ? 'text-amber-400' : 'text-white'}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="card-surface p-5">
          <h3 className="text-xl font-semibold text-white">Today's attendance</h3>
          <div className="mt-4 space-y-3">
            {[
              ['09:30 – 10:30', 'Computer Networks'],
              ['10:30 – 11:30', 'Software Engineering'],
              ['13:30 – 16:30', 'ML Lab · 3 hours'],
            ].map(([time, subject]) => (
              <div key={time} className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">{time}</p>
                    <p className="mt-1 font-medium text-white">{subject}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950">Present</button>
                    <button type="button" className="rounded-lg bg-rose-500 px-3 py-2 text-sm font-semibold text-white">Absent</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-surface p-5">
          <h3 className="text-xl font-semibold text-white">Recent activity</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li className="rounded-xl border border-slate-700 bg-slate-900 p-3">ML attendance improved to 81.82%</li>
            <li className="rounded-xl border border-slate-700 bg-slate-900 p-3">Holiday on 25 September is configured</li>
            <li className="rounded-xl border border-slate-700 bg-slate-900 p-3">DBMS Lab marked complete for this week</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
