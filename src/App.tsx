import { useEffect, useMemo, useState } from 'react'
import Editor from './components/Editor'
import ThemeCard from './components/ThemeCard'
import type { DesktopTheme, ThemesPayload } from './types'

/**
 * App shell. Two views:
 *   grid   — thumbnail cards for every theme in presets.ts (mirrors Hermes'
 *            appearance settings) with an Edit button per card
 *   editor — form + WYSIWYG preview + Apply / keep-or-revert flow
 *
 * Kept edits live in `themes` (session state). "Save to presets.ts" POSTs the
 * whole set: the server backs up the original (yyyyddmm-epoch-presets.ts)
 * then regenerates the file.
 */
export default function App() {
  const [payload, setPayload] = useState<ThemesPayload | null>(null)
  const [themes, setThemes] = useState<DesktopTheme[]>([])
  const [saved, setSaved] = useState<DesktopTheme[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [gridMode, setGridMode] = useState<'light' | 'dark'>('dark')
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [savingBusy, setSavingBusy] = useState(false)

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

  const save = async () => {
    if (!payload) return
    setSavingBusy(true)
    setStatus(null)
    try {
      const res = await fetch('/api/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themes, defaultSkinName: payload.defaultSkinName })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSaved(themes)
      setStatus({ kind: 'ok', text: `Saved. Backup: ${data.backupPath}` })
    } catch (e) {
      setStatus({ kind: 'err', text: `Save failed: ${e}` })
    } finally {
      setSavingBusy(false)
    }
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

  return (
    <div className="shell">
      <header className="grid-header">
        <div>
          <h1>Hermes Theme Editor</h1>
          <p className="path">Source: {payload.presetsPath}</p>
        </div>
        <div className="grid-header__actions">
          <span className="palette-tabs">
            <button className={gridMode === 'light' ? 'on' : ''} onClick={() => setGridMode('light')} type="button">
              Light
            </button>
            <button className={gridMode === 'dark' ? 'on' : ''} onClick={() => setGridMode('dark')} type="button">
              Dark
            </button>
          </span>
          <button className="btn btn--primary" disabled={dirtyNames.size === 0 || savingBusy} onClick={save} type="button">
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
            onEdit={() => setEditing(theme.name)}
            theme={theme}
          />
        ))}
      </div>
    </div>
  )
}
