import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/setup', label: 'Setup' },
  { to: '/students', label: 'Students' },
  { to: '/subjects', label: 'Subjects' },
  { to: '/academic-config', label: 'Academic Config' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/attendance', label: 'Attendance' },
  { to: '/reports', label: 'Reports' },
  { to: '/timetable', label: 'Timetable' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/audit', label: 'Audit' },
  { to: '/backup', label: 'Backup' },
  { to: '/settings', label: 'Settings' },
]

export function AppShell() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
        <aside className="border-b border-slate-800 bg-slate-900/80 p-4 lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r">
          <div className="mb-6 flex items-center justify-between lg:block">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Attendance</p>
              <h1 className="mt-1 text-2xl font-semibold">AIML-3/1</h1>
            </div>
          </div>

          <nav className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {navItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `rounded-xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? 'bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/30'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
