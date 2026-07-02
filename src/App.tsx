import { useEffect, useMemo, useState } from 'react'
import CopyDialog from './components/CopyDialog'
import Editor from './components/Editor'
import ThemeCard from './components/ThemeCard'
import type { DesktopTheme, ThemesPayload } from './types'

/**
 * App shell. Two views:
 *   grid   — thumbnail cards for every theme in presets.ts (mirrors Hermes'
 *            appearance settings) with Edit + Copy buttons per card
 *   editor — form + WYSIWYG preview + Apply / keep-or-revert flow
 *
 * Kept edits live in `themes` (session state). "Save to presets.ts" POSTs the
 * whole set: the server backs up the original (yyyyddmm-epoch-presets.ts),
 * regenerates the file, then prunes backups beyond the "keep backups" limit.
 * Copying a theme saves immediately (backup + write) and opens its editor.
 */

const MAX_BACKUPS_KEY = 'hermes-theme-editor.maxBackups'
const BACKUP_DIR_KEY = 'hermes-theme-editor.backupDir'
const DEFAULT_MAX_BACKUPS = 10

export default function App() {
  const [payload, setPayload] = useState<ThemesPayload | null>(null)
  const [themes, setThemes] = useState<DesktopTheme[]>([])
  const [saved, setSaved] = useState<DesktopTheme[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [copying, setCopying] = useState<string | null>(null)
  const [gridMode, setGridMode] = useState<'light' | 'dark'>('dark')
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [savingBusy, setSavingBusy] = useState(false)
  const [maxBackups, setMaxBackups] = useState(() => {
    const stored = Number(localStorage.getItem(MAX_BACKUPS_KEY))
    return Number.isFinite(stored) && stored >= 1 ? stored : DEFAULT_MAX_BACKUPS
  })
  const [backupDir, setBackupDir] = useState(() => localStorage.getItem(BACKUP_DIR_KEY) ?? '')

  useEffect(() => {
    localStorage.setItem(MAX_BACKUPS_KEY, String(maxBackups))
  }, [maxBackups])

  useEffect(() => {
    localStorage.setItem(BACKUP_DIR_KEY, backupDir)
  }, [backupDir])

  useEffect(() => {
    fetch('/api/themes')
      .then(r => (r.ok ? r.json() : r.json().then((e: { error: string }) => Promise.reject(e.error))))
      .then((p: ThemesPayload) => {
        setPayload(p)
        setThemes(p.themes)
        setSaved(p.themes)
      })
      .catch(e => setStatus({ kind: 'err', text: `Failed to load presets.ts: ${e}` }))
  }, [])

  const dirtyNames = useMemo(() => {
    const savedByName = new Map(saved.map(t => [t.name, JSON.stringify(t)]))
    return new Set(themes.filter(t => savedByName.get(t.name) !== JSON.stringify(t)).map(t => t.name))
  }, [themes, saved])

  /** Backup + write the given list to presets.ts. Returns true on success. */
  const persist = async (list: DesktopTheme[], defaultSkinName?: string): Promise<boolean> => {
    if (!payload) return false
    const skin = defaultSkinName ?? payload.defaultSkinName
    setSavingBusy(true)
    setStatus(null)
    try {
      const res = await fetch('/api/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themes: list, defaultSkinName: skin, maxBackups, backupDir: backupDir.trim() || undefined })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setThemes(list)
      setSaved(list)
      setPayload(p => (p ? { ...p, defaultSkinName: skin } : p))
      const prunedNote = data.pruned?.length ? ` Pruned ${data.pruned.length} old backup${data.pruned.length === 1 ? '' : 's'}.` : ''
      setStatus({ kind: 'ok', text: `Saved. Backup: ${data.backupPath}.${prunedNote}` })
      return true
    } catch (e) {
      setStatus({ kind: 'err', text: `Save failed: ${e}` })
      return false
    } finally {
      setSavingBusy(false)
    }
  }

  const createCopy = async (copy: DesktopTheme) => {
    const ok = await persist([...themes, copy])
    if (ok) {
      setCopying(null)
      setEditing(copy.name) // straight into the editor for the new theme
    }
  }

  const removeTheme = async (theme: DesktopTheme) => {
    if (themes.length <= 1) return // belt & braces — the button is also disabled
    if (!window.confirm(`Remove "${theme.label}" (${theme.name}) from presets.ts?\nA backup is taken first.`)) return
    const remaining = themes.filter(t => t.name !== theme.name)
    // presets.ts' DEFAULT_SKIN_NAME must point at a theme that exists.
    const nextDefault = payload!.defaultSkinName === theme.name ? remaining[0].name : payload!.defaultSkinName
    await persist(remaining, nextDefault)
  }

  if (!payload) return <div className="shell">{status ? <p className="error">{status.text}</p> : 'Loading themes…'}</div>

  const editingTheme = editing ? themes.find(t => t.name === editing) : null
  if (editingTheme) {
    return (
      <Editor
        key={editingTheme.name}
        onBack={() => setEditing(null)}
        onCommit={updated => setThemes(list => list.map(t => (t.name === updated.name ? updated : t)))}
        theme={editingTheme}
      />
    )
  }

  const copySource = copying ? themes.find(t => t.name === copying) : null

  return (
    <div className="shell">
      <header className="grid-header">
        <div>
          <h1>Hermes Theme Editor</h1>
          <p className="path">Source: {payload.presetsPath}</p>
        </div>
        <div className="grid-header__actions">
          <label className="backup-limit backup-limit--path" title="Directory for yyyyddmm-epoch-presets.ts backups. Empty = next to presets.ts. ~ is expanded; created if missing.">
            Backup dir
            <input
              onChange={e => setBackupDir(e.target.value)}
              placeholder="(next to presets.ts)"
              spellCheck={false}
              type="text"
              value={backupDir}
            />
          </label>
          <label className="backup-limit" title="Oldest backups beyond this count are deleted after each save">
            Keep backups
            <input
              max={999}
              min={1}
              onChange={e => {
                const n = Math.floor(Number(e.target.value))
                if (Number.isFinite(n)) setMaxBackups(Math.min(999, Math.max(1, n)))
              }}
              type="number"
              value={maxBackups}
            />
          </label>
          <span className="palette-tabs">
            <button className={gridMode === 'light' ? 'on' : ''} onClick={() => setGridMode('light')} type="button">
              Light
            </button>
            <button className={gridMode === 'dark' ? 'on' : ''} onClick={() => setGridMode('dark')} type="button">
              Dark
            </button>
          </span>
          <button
            className="btn btn--primary"
            disabled={dirtyNames.size === 0 || savingBusy}
            onClick={() => persist(themes)}
            type="button"
          >
            {savingBusy ? 'Saving…' : `Save to presets.ts${dirtyNames.size ? ` (${dirtyNames.size} edited)` : ''}`}
          </button>
        </div>
      </header>
      {status && <p className={status.kind === 'ok' ? 'status-ok' : 'error'}>{status.text}</p>}
      <div className="theme-grid">
        {themes.map(theme => (
          <ThemeCard
            dirty={dirtyNames.has(theme.name)}
            isDefault={theme.name === payload.defaultSkinName}
            key={theme.name}
            mode={gridMode}
            lastTheme={themes.length <= 1}
            onCopy={() => setCopying(theme.name)}
            onEdit={() => setEditing(theme.name)}
            onRemove={() => removeTheme(theme)}
            theme={theme}
          />
        ))}
      </div>
      {copySource && (
        <CopyDialog
          busy={savingBusy}
          onCancel={() => setCopying(null)}
          onCreate={createCopy}
          source={copySource}
          takenNames={themes.map(t => t.name)}
        />
      )}
    </div>
  )
}
