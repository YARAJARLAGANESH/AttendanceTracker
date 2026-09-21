import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { buildBackupFileName, exportGroupBackup, importGroupBackup, validateBackupPayload, type BackupImportMode, type BackupPayload } from '../repositories/backup'

const ACCEPTED_FILE_TYPE = 'application/json'

export function BackupPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [groupId, setGroupId] = useState<string | null>(null)
  const [groupName, setGroupName] = useState('')
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [validationState, setValidationState] = useState<{ valid: boolean; errors: string[]; summary: { students: number; subjects: number; timetable: number; academicDays: number; attendance: number }; hasData: boolean } | null>(null)
  const [selectedBackup, setSelectedBackup] = useState<BackupPayload | null>(null)
  const [backupFile, setBackupFile] = useState<File | null>(null)
  const [importMode, setImportMode] = useState<BackupImportMode>('replace')
  const [confirmationText, setConfirmationText] = useState('')
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [lastExport, setLastExport] = useState<string | null>(null)

  useEffect(() => {
    const loadGroup = async () => {
      try {
        const { data: groups, error } = await supabase.from('groups').select('*').limit(1)
        if (error) throw error

        const firstGroup = groups?.[0]
        if (!firstGroup) {
          setGroupId(null)
          setGroupName('')
          return
        }

        setGroupId(firstGroup.id)
        setGroupName(firstGroup.name)
      } catch (error) {
        setStatus({ type: 'error', message: error instanceof Error ? error.message : 'Unable to determine current group.' })
      }
    }

    void loadGroup()
  }, [])

  const exportBackup = async () => {
    if (!groupId) {
      setStatus({ type: 'error', message: 'No group is available for this backup.' })
      return
    }

    try {
      setExporting(true)
      setStatus({ type: 'info', message: 'Preparing backup data...' })
      const payload = await exportGroupBackup(groupId)
      const json = JSON.stringify(payload, null, 2)
      const blob = new Blob([json], { type: ACCEPTED_FILE_TYPE })
      const href = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = href
      link.download = buildBackupFileName(payload.group.name || groupName || 'group')
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(href)

      const exportedAt = new Date(payload.exportedAt).toLocaleString()
      setLastExport(exportedAt)
      setStatus({ type: 'success', message: `Backup exported successfully for ${payload.group.name}.` })
    } catch (error) {
      setStatus({ type: 'error', message: error instanceof Error ? error.message : 'Unable to export backup.' })
    } finally {
      setExporting(false)
    }
  }

  const readBackupFile = async (file: File) => {
    if (!file) return
    if (file.type && file.type !== ACCEPTED_FILE_TYPE && !file.name.endsWith('.json')) {
      setStatus({ type: 'error', message: 'Only JSON backup files are supported.' })
      return
    }

    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as unknown
      const validation = validateBackupPayload(parsed)
      const normalized = validation.valid ? (parsed as BackupPayload) : null
      setValidationState(validation)
      setSelectedBackup(normalized)
      setBackupFile(file)

      if (!validation.valid) {
        setStatus({ type: 'error', message: validation.errors[0] ?? 'Backup validation failed.' })
        return
      }

      setStatus({ type: 'success', message: `${file.name} passed validation for import.` })
    } catch (error) {
      setValidationState({ valid: false, errors: ['The selected file is not valid JSON or could not be read.'], summary: { students: 0, subjects: 0, timetable: 0, academicDays: 0, attendance: 0 }, hasData: false })
      setSelectedBackup(null)
      setStatus({ type: 'error', message: error instanceof Error ? error.message : 'The backup file could not be parsed.' })
    }
  }

  const confirmTextIsValid = confirmationText === 'IMPORT'

  const summaryCount = useMemo(() => {
    if (!validationState) return null
    return validationState.summary
  }, [validationState])

  const importBackup = async () => {
    if (!groupId || !selectedBackup) {
      setStatus({ type: 'error', message: 'Please select a valid backup file before importing.' })
      return
    }

    if (!confirmTextIsValid) {
      setStatus({ type: 'error', message: 'Type IMPORT to confirm the destructive import action.' })
      return
    }

    try {
      setImporting(true)
      setStatus({ type: 'info', message: 'Validating imported backup...' })
      await importGroupBackup(selectedBackup, groupId, importMode)
      setStatus({ type: 'success', message: 'Backup import completed and data was verified successfully.' })
      setConfirmationText('')
      setSelectedBackup(null)
      setBackupFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      setStatus({ type: 'error', message: error instanceof Error ? error.message : 'Import failed.' })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="card-surface p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-sky-300">Backup & Data</p>
        <h2 className="mt-2 text-3xl font-bold text-white">Backup / Import / Export</h2>
        <p className="mt-2 text-sm text-slate-300">Export a verified group backup, validate a downloaded file before import, and restore data with explicit confirmation.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card-surface p-6">
          <h3 className="text-xl font-semibold text-white">Export Backup</h3>
          <p className="mt-3 text-sm text-slate-300">Download a complete backup of your attendance data for the active group.</p>

          <div className="mt-5 rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-200">
            <p className="font-medium text-white">Target group</p>
            <p className="mt-1">{groupName || 'No group selected'}</p>
            {lastExport ? <p className="mt-3 text-slate-400">Last export: {lastExport}</p> : null}
          </div>

          <button type="button" onClick={exportBackup} disabled={exporting || !groupId} className="mt-5 rounded-xl bg-sky-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300">
            {exporting ? 'Preparing backup...' : 'Export Backup'}
          </button>
        </section>

        <section className="card-surface p-6">
          <h3 className="text-xl font-semibold text-white">Import Backup</h3>
          <p className="mt-3 text-sm text-slate-300">Choose a previously exported Attendance Tracker backup and validate it before modifying data.</p>

          <label className="mt-5 block text-sm font-medium text-slate-200" htmlFor="backup-file-input">
            Select backup file
          </label>
          <input
            id="backup-file-input"
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null
              if (file) {
                void readBackupFile(file)
              }
            }}
            className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-slate-200 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-500 file:px-3 file:py-2 file:font-medium file:text-slate-950"
          />

          {backupFile ? <p className="mt-4 text-sm text-slate-300">File: {backupFile.name}</p> : null}

          <div className="mt-5 space-y-3 rounded-xl border border-slate-700 bg-slate-900 p-4">
            <label className="block text-sm text-slate-200">
              Import mode
              <select value={importMode} onChange={(event) => setImportMode(event.target.value as BackupImportMode)} className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">
                <option value="replace">Replace</option>
                <option value="merge">Merge</option>
              </select>
            </label>

            <p className="text-xs text-slate-400">Replace deletes the current group data before re-inserting the backup. Merge adds/updates compatible records without clearing the group first.</p>
          </div>

          <div className="mt-5">
            <button type="button" onClick={() => selectedBackup && validationState?.valid ? importBackup() : setStatus({ type: 'error', message: 'Validate a backup before continuing.' })} disabled={importing || !selectedBackup || !validationState?.valid || !groupId} className="rounded-xl bg-amber-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300">
              {importing ? 'Importing...' : 'Validate Backup'}
            </button>
          </div>
        </section>
      </div>

      {status ? (
        <div className={`rounded-xl border p-4 text-sm ${status.type === 'success' ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200' : status.type === 'error' ? 'border-red-500/60 bg-red-500/10 text-red-200' : 'border-sky-500/60 bg-sky-500/10 text-sky-200'}`}>
          {status.message}
        </div>
      ) : null}

      {validationState ? (
        <section className="card-surface p-6">
          <h3 className="text-xl font-semibold text-white">Backup Validation</h3>

          {validationState.valid ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  ['Students', summaryCount?.students ?? 0],
                  ['Subjects', summaryCount?.subjects ?? 0],
                  ['Timetable', summaryCount?.timetable ?? 0],
                  ['Academic days', summaryCount?.academicDays ?? 0],
                  ['Attendance', summaryCount?.attendance ?? 0],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm">
                    <p className="text-slate-400">{label}</p>
                    <p className="mt-2 text-xl font-bold text-white">{value}</p>
                  </div>
                ))}
              </div>

              <p className="text-sm text-emerald-200">No validation errors found.</p>

              {importMode === 'replace' ? (
                <div className="rounded-xl border border-amber-500/60 bg-amber-500/10 p-4 text-sm text-amber-100">
                  <p className="font-semibold">Replace Existing Data?</p>
                  <p className="mt-2">This operation may replace existing attendance data for the selected group. Existing data may be permanently changed.</p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input type="text" value={confirmationText} onChange={(event) => setConfirmationText(event.target.value)} placeholder="Type IMPORT" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" aria-label="Type IMPORT to confirm destructive data replacement" />
                    <button type="button" onClick={importBackup} disabled={!confirmTextIsValid || importing || !groupId} className="rounded-xl bg-red-500 px-4 py-3 font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:bg-slate-700">
                      {importing ? 'Importing...' : 'Confirm Import'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-sky-500/60 bg-sky-500/10 p-4 text-sm text-sky-100">
                  <p className="font-semibold">Merge mode selected</p>
                  <p className="mt-2">Compatible records will be added or updated without clearing the existing group data first.</p>
                  <button type="button" onClick={importBackup} disabled={importing || !groupId} className="mt-4 rounded-xl bg-sky-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700">
                    {importing ? 'Importing...' : 'Confirm Import'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-red-200">Backup validation failed.</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
                {validationState.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ) : null}
    </div>
  )
}
