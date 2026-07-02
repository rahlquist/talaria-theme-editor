import { useCallback, useMemo, useState } from 'react'
import type { DesktopTheme, DesktopThemeColors } from '../types'
import { OPTIONAL_COLOR_KEYS, REQUIRED_COLOR_KEYS } from '../types'
import ColorField from './ColorField'
import KeepDialog from './KeepDialog'
import PreviewPane from './PreviewPane'

/**
 * Edit-one-theme screen. Flow (as specced):
 *   form edits build a draft → preview keeps showing the committed theme →
 *   Apply paints the draft into the preview and opens KeepDialog →
 *   Keep commits the draft upward / Revert (or the 10s timeout) discards it.
 */

type PaletteTab = 'light' | 'dark'

interface EditorProps {
  theme: DesktopTheme
  onCommit: (theme: DesktopTheme) => void
  onBack: () => void
}

export default function Editor({ theme: committed, onCommit, onBack }: EditorProps) {
  const [draft, setDraft] = useState<DesktopTheme>(committed)
  const [confirming, setConfirming] = useState(false)
  const [tab, setTab] = useState<PaletteTab>('light')
  const [previewMode, setPreviewMode] = useState<PaletteTab>(committed.darkColors ? 'dark' : 'light')
  const [fontScale, setFontScale] = useState(1)

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(committed), [draft, committed])
  const previewTheme = confirming ? draft : committed

  const paletteKey = tab === 'dark' ? 'darkColors' : 'colors'
  const palette = draft[paletteKey]

  const setColor = (key: string, value: string | undefined) => {
    setDraft(d => ({
      ...d,
      [paletteKey]: { ...(d[paletteKey] as DesktopThemeColors), [key]: value }
    }))
  }

  const setTypography = (key: 'fontSans' | 'fontMono' | 'fontUrl', value: string) => {
    setDraft(d => {
      const typography = { ...d.typography, [key]: value || undefined }
      const empty = Object.values(typography).every(v => v === undefined)
      return { ...d, typography: empty ? undefined : typography }
    })
  }

  const revert = useCallback(() => {
    setDraft(committed)
    setConfirming(false)
  }, [committed])

  const keep = useCallback(() => {
    onCommit(draft)
    setConfirming(false)
  }, [draft, onCommit])

  return (
    <div className="editor">
      <header className="editor__bar">
        <button className="btn" onClick={onBack} type="button">← All themes</button>
        <h2>
          Editing: {draft.label} <code>({draft.name})</code>
        </h2>
        <div className="editor__bar-actions">
          <button className="btn" disabled={!dirty || confirming} onClick={revert} type="button">
            Discard draft
          </button>
          <button
            className="btn btn--primary"
            disabled={!dirty || confirming}
            onClick={() => setConfirming(true)}
            type="button"
          >
            Apply to preview
          </button>
        </div>
      </header>

      <div className="editor__split">
        <div className="editor__form">
          <section>
            <h3>Meta</h3>
            <label className="text-field">
              <span>Label</span>
              <input onChange={e => setDraft(d => ({ ...d, label: e.target.value }))} value={draft.label} />
            </label>
            <label className="text-field">
              <span>Description</span>
              <input onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} value={draft.description} />
            </label>
          </section>

          <section>
            <h3>
              Colors
              <span className="palette-tabs">
                <button className={tab === 'light' ? 'on' : ''} onClick={() => setTab('light')} type="button">
                  Light
                </button>
                <button
                  className={tab === 'dark' ? 'on' : ''}
                  disabled={!draft.darkColors}
                  onClick={() => setTab('dark')}
                  type="button"
                >
                  Dark
                </button>
              </span>
            </h3>
            {!draft.darkColors && (
              <p className="hint">
                No hand-tuned dark palette — Hermes reuses the light colors in dark mode.{' '}
                <button
                  className="btn btn--small"
                  onClick={() => setDraft(d => ({ ...d, darkColors: { ...d.colors } }))}
                  type="button"
                >
                  Add dark palette
                </button>
              </p>
            )}
            {tab === 'dark' && draft.darkColors && (
              <p className="hint">
                <button
                  className="btn btn--small"
                  onClick={() => {
                    setTab('light')
                    setDraft(d => ({ ...d, darkColors: undefined }))
                  }}
                  type="button"
                >
                  Remove dark palette
                </button>
              </p>
            )}
            {palette && (
              <>
                {REQUIRED_COLOR_KEYS.map(key => (
                  <ColorField key={`${tab}-${key}`} label={key} onChange={v => setColor(key, v ?? '')} value={palette[key]} />
                ))}
                <h4>Optional tokens (unset = Hermes fallback)</h4>
                {OPTIONAL_COLOR_KEYS.map(key => (
                  <ColorField key={`${tab}-${key}`} label={key} onChange={v => setColor(key, v)} optional value={palette[key]} />
                ))}
              </>
            )}
          </section>

          <section>
            <h3>Typography</h3>
            <label className="text-field">
              <span>fontSans (CSS stack)</span>
              <input
                onChange={e => setTypography('fontSans', e.target.value)}
                placeholder="inherit Hermes default"
                value={draft.typography?.fontSans ?? ''}
              />
            </label>
            <label className="text-field">
              <span>fontMono (CSS stack)</span>
              <input
                onChange={e => setTypography('fontMono', e.target.value)}
                placeholder="inherit Hermes default"
                value={draft.typography?.fontMono ?? ''}
              />
            </label>
            <label className="text-field">
              <span>fontUrl (stylesheet)</span>
              <input
                onChange={e => setTypography('fontUrl', e.target.value)}
                placeholder="https://fonts.googleapis.com/css2?family=…"
                value={draft.typography?.fontUrl ?? ''}
              />
            </label>
            <p className="hint">
              Font <em>size</em> is not part of presets.ts (Hermes keeps sizing in styles.css), so the zoom below
              affects the preview only.
            </p>
          </section>
        </div>

        <div className="editor__preview">
          <div className="editor__preview-controls">
            <span className="palette-tabs">
              <button className={previewMode === 'light' ? 'on' : ''} onClick={() => setPreviewMode('light')} type="button">
                Preview light
              </button>
              <button className={previewMode === 'dark' ? 'on' : ''} onClick={() => setPreviewMode('dark')} type="button">
                Preview dark
              </button>
            </span>
            <label className="zoom">
              Preview zoom {Math.round(fontScale * 100)}%
              <input
                max={1.5}
                min={0.75}
                onChange={e => setFontScale(Number(e.target.value))}
                step={0.05}
                type="range"
                value={fontScale}
              />
            </label>
            {confirming && <span className="tag tag--dirty">showing draft</span>}
          </div>
          <PreviewPane fontScale={fontScale} mode={previewMode} theme={previewTheme} />
        </div>
      </div>

      {confirming && <KeepDialog onKeep={keep} onRevert={revert} />}
    </div>
  )
}
