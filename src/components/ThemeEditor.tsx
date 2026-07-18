import { useState } from 'react'
import type { DesktopTheme, DesktopThemeColors } from '../types'
import ColorField from './ColorField'

/** Repo #1's logical color groupings, reused here with the repo #2 picker. */
const COLOR_GROUPS: Record<string, (keyof DesktopThemeColors)[]> = {
  Surface: ['background', 'foreground', 'card', 'cardForeground'],
  Muted: ['muted', 'mutedForeground', 'popover', 'popoverForeground'],
  Brand: ['primary', 'primaryForeground', 'secondary', 'secondaryForeground'],
  Accent: ['accent', 'accentForeground', 'ring', 'midground'],
  Borders: ['border', 'input', 'composerRing'],
  Destructive: ['destructive', 'destructiveForeground'],
  Sidebar: ['sidebarBackground', 'sidebarBorder'],
  Bubbles: ['userBubble', 'userBubbleBorder'],
}

const OPTIONAL_KEYS = [
  'midground',
  'midgroundForeground',
  'composerRing',
  'sidebarBackground',
  'sidebarBorder',
  'userBubble',
  'userBubbleBorder',
] as const

export default function ThemeEditor({
  theme,
  onChangeColor,
  onChangeMeta,
  onChangeTypo,
}: {
  theme: DesktopTheme
  onChangeColor: (palette: string, key: string, value: string | undefined) => void
  onChangeMeta: (key: string, value: string) => void
  onChangeTypo: (key: 'fontSans' | 'fontMono' | 'fontUrl', value: string) => void
}) {
  const [paletteTab, setPaletteTab] = useState<'colors' | 'darkColors'>('colors')
  const hasDark = !!theme.darkColors
  const currentPalette =
    paletteTab === 'darkColors' && theme.darkColors ? theme.darkColors : theme.colors

  const setColor = (key: string, value: string | undefined) =>
    onChangeColor(paletteTab, key, value)

  return (
    <div className="editor-sidebar">
      <h2>{theme.label || theme.name}</h2>
      <div className="theme-meta">Editing: {theme.name}</div>

      {/* Meta */}
      <div className="editor-section">
        <div className="text-field">
          <label>Label</label>
          <input
            type="text"
            value={theme.label || ''}
            onChange={e => onChangeMeta('label', e.target.value)}
          />
        </div>
        <div className="text-field">
          <label>Description</label>
          <input
            type="text"
            value={theme.description || ''}
            onChange={e => onChangeMeta('description', e.target.value)}
          />
        </div>
      </div>

      {/* Colors */}
      <div className="editor-section">
        <div className="editor-section-title">Colors</div>
        <div className="palette-tabs">
          <button
            className={paletteTab === 'colors' ? 'on' : ''}
            onClick={() => setPaletteTab('colors')}
            type="button"
          >
            Light
          </button>
          <button
            className={paletteTab === 'darkColors' ? 'on' : ''}
            onClick={() => setPaletteTab('darkColors')}
            disabled={!hasDark}
            title={!hasDark ? 'No darkColors defined for this theme' : ''}
            type="button"
          >
            Dark
          </button>
        </div>

        {Object.entries(COLOR_GROUPS).map(([group, keys]) => {
          const displayKeys = keys.filter(k => currentPalette[k] !== undefined)
          if (displayKeys.length === 0) return null
          return (
            <div key={group} className="color-group">
              <div className="color-group-title">{group}</div>
              {displayKeys.map(key => (
                <ColorField
                  key={key}
                  label={key}
                  value={currentPalette[key]}
                  onChange={v => setColor(key, v)}
                />
              ))}
            </div>
          )
        })}

        {/* Add optional tokens */}
        <div className="color-group">
          <div className="color-group-title">Add Optional Color</div>
          <div className="optional-add-row">
            {OPTIONAL_KEYS.filter(k => currentPalette[k] === undefined).map(key => (
              <button
                key={key}
                className="btn btn-sm"
                onClick={() => setColor(key, '#888888')}
                type="button"
              >
                + {key}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Typography */}
      <div className="editor-section">
        <div className="editor-section-title">Typography</div>
        <div className="text-field">
          <label>fontSans</label>
          <input
            type="text"
            value={theme.typography?.fontSans || ''}
            onChange={e => onChangeTypo('fontSans', e.target.value)}
          />
        </div>
        <div className="text-field">
          <label>fontMono</label>
          <input
            type="text"
            value={theme.typography?.fontMono || ''}
            onChange={e => onChangeTypo('fontMono', e.target.value)}
          />
        </div>
        <div className="text-field">
          <label>fontUrl</label>
          <input
            type="text"
            value={theme.typography?.fontUrl || ''}
            onChange={e => onChangeTypo('fontUrl', e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
