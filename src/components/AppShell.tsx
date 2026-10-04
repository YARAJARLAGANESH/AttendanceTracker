import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

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
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">

      <div className="mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">

        {/* NAVBAR */}
        <aside
          className="
            border-b
            border-slate-800
            bg-slate-900/80
            p-4
            lg:flex
            lg:min-h-screen
            lg:w-64
            lg:flex-col
            lg:border-b-0
            lg:border-r
          "
        >

          {/* BRAND */}
          <div className="mb-4 shrink-0 lg:mb-6">
            <p className="text-xs uppercase tracking-[0.2em] text-sky-300">
              Attendance
            </p>

            <h1 className="mt-1 text-2xl font-semibold">
              AIML-3/1
            </h1>
          </div>

          {/* NAVIGATION */}
          <nav
            className="
              flex
              gap-2
              overflow-x-auto
              pb-2
              lg:flex-1
              lg:flex-col
              lg:overflow-visible
              lg:pb-0
            "
          >
            {navItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `
                  min-w-max
                  rounded-xl
                  px-4
                  py-3
                  text-sm
                  font-medium
                  transition
                  ${
                    isActive
                      ? 'bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/30'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }
                  `
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* PROFILE - LAST ITEM IN NAVBAR */}
          <div className="mt-4 shrink-0 lg:mt-auto lg:pt-6">

            <div className="border-t border-slate-700 pt-4">

              <div className="flex items-center justify-between gap-3">

                <div className="flex min-w-0 items-center gap-3">

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sm font-bold text-sky-300">
                    AS
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Profile
                    </p>

                    <p className="truncate text-sm font-semibold text-white">
                      AIML-3/1
                    </p>
                  </div>

                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="
                    shrink-0
                    rounded-xl
                    border
                    border-red-500/40
                    bg-red-500/10
                    px-4
                    py-2
                    text-sm
                    font-semibold
                    text-red-300
                    transition
                    hover:bg-red-500/20
                    hover:text-red-200
                  "
                >
                  Logout
                </button>

              </div>

            </div>

          </div>

        </aside>

        {/* PAGE DESCRIPTION / CONTENT */}
        <main className="min-w-0 flex-1 p-4 md:p-6">
          <Outlet />
        </main>

      </div>

    </div>
  )
}