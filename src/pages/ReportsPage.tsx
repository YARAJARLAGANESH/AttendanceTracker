export function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        {['Weekly', 'Monthly', 'Subject', 'Overall'].map((label) => (
          <button type="button" key={label} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100">
            {label}
          </button>
        ))}
      </div>

      <div className="card-surface p-5">
        <h2 className="text-2xl font-bold text-white">September 2026</h2>
        <div className="mt-5 space-y-3 text-sm text-slate-300">
          {[
            'Computer Networks — 84.62%',
            'Software Engineering — 80.00%',
            'DBMS — 91.67%',
            'ML — 72.73% ⚠️',
            'IPR — 87.50%',
            'DAA — 76.92%',
            'ML Lab — 90.00%',
            'DBMS Lab — 83.33%',
            'Skill Lab — 100%',
            'Internship — 100%',
          ].map((line) => (
            <div key={line} className="rounded-xl border border-slate-700 bg-slate-900 p-3">{line}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
