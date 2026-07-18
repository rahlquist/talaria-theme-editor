import { useEffect, useMemo, useRef, useState } from 'react'
import ThemeList from './components/ThemeList'
import ThemeEditor from './components/ThemeEditor'
import PreviewPane from './components/PreviewPane'
import KeepDialog from './components/KeepDialog'
import CopyDialog from './components/CopyDialog'
import type { DesktopTheme, DesktopThemeColors, ThemesPayload } from './types'

/**
 * Repo #1-style 3-pane shell (theme list | editor | live preview) with an
 * apply bar and keep/revert fail-safe, sitting on repo #2's evaluated backend.
 * The list shows every theme; the editor edits the selected one; preview
 * reflects the *committed* theme until Apply paints the draft.
 */

const MAX_BACKUPS_KEY = 'talaria-theme-editor.maxBackups'
const BACKUP_DIR_KEY = 'talaria-theme-editor.backupDir'
const DEFAULT_MAX_BACKUPS = 10

export default function App() {
  const [payload, setPayload] = useState<ThemesPayload | null>(null)
  const [themes, setThemes] = useState<DesktopTheme[]>([])
  const [saved, setSaved] = useState<DesktopTheme[]>([])
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('light')
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [savingBusy, setSavingBusy] = useState(false)
  const [maxBackups, setMaxBackups] = useState(() => {
    const stored = Number(localStorage.getItem(MAX_BACKUPS_KEY))
    return Number.isFinite(stored) && stored >= 1 ? stored : DEFAULT_MAX_BACKUPS
  })
  const [backupDir, setBackupDir] = useState(() => localStorage.getItem(BACKUP_DIR_KEY) ?? '')
  const [keepOpen, setKeepOpen] = useState(false)
  const [copySource, setCopySource] = useState<string | null>(null)
  const preApplySaved = useRef<DesktopTheme[]>([])

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
        if (p.themes[0]) {
          setSelectedName(p.themes[0].name)
          setPreviewMode(p.themes[0].darkColors ? 'dark' : 'light')
        }
      })
      .catch(e => setStatus({ kind: 'err', text: `Failed to load presets.ts: ${e}` }))
  }, [])

  const dirtyNames = useMemo(() => {
    const savedByName = new Map(saved.map(t => [t.name, JSON.stringify(t)]))
    return new Set(
      themes.filter(t => savedByName.get(t.name) !== JSON.stringify(t)).map(t => t.name)
    )
  }, [themes, saved])

  const workingTheme = selectedName ? themes.find(t => t.name === selectedName) ?? null : null

  const showStatus = (msg: string, kind: 'ok' | 'err' = 'ok') => {
    setStatus({ kind, text: msg })
    window.setTimeout(() => setStatus(s => (s && s.text === msg ? null : s)), 4000)
  }

  const persist = async (list: DesktopTheme[], defaultSkinName?: string): Promise<boolean> => {
    if (!payload) return false
    const skin = defaultSkinName ?? payload.defaultSkinName
    setSavingBusy(true)
    try {
      const res = await fetch('/api/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          themes: list,
          defaultSkinName: skin,
          maxBackups,
          backupDir: backupDir.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setThemes(list)
      setSaved(list)
      const prunedNote = data.pruned?.length
        ? ` Pruned ${data.pruned.length} old backup${data.pruned.length === 1 ? '' : 's'}.`
        : ''
      showStatus(`Saved. Backup: ${data.backupPath}.${prunedNote}`)
      return true
    } catch (e) {
      showStatus(`Save failed: ${e}`, 'err')
      return false
    } finally {
      setSavingBusy(false)
    }
  }

  const setColor = (palette: string, key: string, value: string | undefined) => {
    if (!selectedName) return
    setThemes(prev =>
      prev.map(t => {
        if (t.name !== selectedName) return t
        const next = { ...t }
        if (palette === 'darkColors') {
          next.darkColors = { ...(next.darkColors || {}), [key]: value } as DesktopTheme['darkColors']
        } else {
          next.colors = { ...next.colors, [key]: value } as DesktopThemeColors
        }
        return next
      })
    )
  }

  const setMeta = (key: string, value: string) => {
    if (!selectedName) return
    setThemes(prev => prev.map(t => (t.name === selectedName ? { ...t, [key]: value } : t)))
  }

  const setTypo = (key: 'fontSans' | 'fontMono' | 'fontUrl', value: string) => {
    if (!selectedName) return
    setThemes(prev =>
      prev.map(t => {
        if (t.name !== selectedName) return t
        const typography = { ...t.typography, [key]: value || undefined }
        const empty = Object.values(typography).every(v => v === undefined)
        return { ...t, typography: empty ? undefined : typography }
      })
    )
  }

  const handleSelect = (name: string) => {
    if (dirtyNames.size > 0 && name !== selectedName) {
      if (!window.confirm('You have unsaved changes. Switch themes and discard them?')) return
      setThemes(saved)
    }
    setSelectedName(name)
    const t = themes.find(x => x.name === name)
    if (t) setPreviewMode(t.darkColors ? 'dark' : 'light')
  }

  const handleApply = async () => {
    if (!workingTheme) return
    // Capture the pre-apply baseline so "Revert" can restore the in-memory
    // draft to the state before this Apply (the disk write + backup already
    // happened inside persist).
    preApplySaved.current = saved
    const ok = await persist(themes)
    if (ok) setKeepOpen(true)
  }

  const handleCopyCreate = async (copy: DesktopTheme) => {
    const ok = await persist([...themes, copy])
    if (ok) {
      setCopySource(null)
      setSelectedName(copy.name)
    }
  }

  const handleRemove = async (name: string) => {
    if (themes.length <= 1) return
    if (!window.confirm(`Remove "${name}"? A backup is taken first.`)) return
    const remaining = themes.filter(t => t.name !== name)
    const nextDefault =
      payload!.defaultSkinName === name ? remaining[0].name : payload!.defaultSkinName
    const ok = await persist(remaining, nextDefault)
    if (ok && selectedName === name) setSelectedName(remaining[0]?.name ?? null)
  }

  if (!payload || !workingTheme) {
    return (
      <div className="app-layout">
        <div className="app-header">
          <h1>Talaria Theme Editor</h1>
          <span className="subtitle">for Hermes Agent</span>
        </div>
        <div className="empty-state">
          <div className="icon">🎨</div>
          <h2>{payload ? 'Select a theme to edit' : 'Loading themes…'}</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="app-layout">
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h1>Talaria Theme Editor</h1>
          <span className="subtitle">for Hermes Agent</span>
        </div>
        <div className="header-controls">
          <label>
            Max backups:
            <input
              type="number"
              min={1}
              max={9999}
              value={maxBackups}
              onChange={e => setMaxBackups(Math.min(9999, Math.max(1, Math.floor(Number(e.target.value)) || DEFAULT_MAX_BACKUPS)))}
            />
          </label>
          <label>
            Backup dir:
            <input
              type="text"
              value={backupDir}
              placeholder="(next to presets.ts)"
              onChange={e => setBackupDir(e.target.value)}
            />
          </label>
        </div>
      </header>

      <div className="app-main">
        <ThemeList
          themes={themes}
          selectedName={selectedName}
          isDefault={name => name === payload.defaultSkinName}
          dirtyNames={dirtyNames}
          onSelect={handleSelect}
          onCopy={setCopySource}
          onDelete={handleRemove}
        />

        <ThemeEditor
          theme={workingTheme}
          onChangeColor={setColor}
          onChangeMeta={setMeta}
          onChangeTypo={setTypo}
        />

        <div className="preview-panel">
          <div className="preview-toolbar">
            <h3>WYSIWYG Preview</h3>
            <div className="mode-toggle">
              <button
                className={`mode-btn ${previewMode === 'light' ? 'active' : ''}`}
                onClick={() => setPreviewMode('light')}
                type="button"
              >
                ☀️ Light
              </button>
              <button
                className={`mode-btn ${previewMode === 'dark' ? 'active' : ''}`}
                onClick={() => setPreviewMode('dark')}
                type="button"
              >
                🌙 Dark
              </button>
            </div>
          </div>
          <div className="preview-frame">
            <PreviewPane theme={workingTheme} mode={previewMode} fontScale={1} />
          </div>
        </div>
      </div>

      <div className="apply-bar">
        <span className="has-changes">
          {dirtyNames.size > 0 ? `⚠️ ${dirtyNames.size} theme(s) edited` : '💡 No changes'}
        </span>
        <div style={{ flex: 1 }} />
        <button
          className="btn btn-accent"
          disabled={dirtyNames.size === 0 || savingBusy}
          onClick={handleApply}
          type="button"
        >
          {savingBusy ? 'Saving…' : 'Apply Changes'}
        </button>
      </div>

      {status && <div className={`status-msg ${status.kind}`}>{status.text}</div>}

      {keepOpen && (
        <KeepDialog
          onKeep={() => setKeepOpen(false)}
          onRevert={async () => {
            setThemes(preApplySaved.current)
            setKeepOpen(false)
          }}
        />
      )}

      {copySource && (
        <CopyDialog
          source={themes.find(t => t.name === copySource)!}
          takenNames={themes.map(t => t.name)}
          busy={savingBusy}
          onCancel={() => setCopySource(null)}
          onCreate={handleCopyCreate}
        />
      )}
    </div>
  )
}
