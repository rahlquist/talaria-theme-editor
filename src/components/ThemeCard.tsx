import type { DesktopTheme } from '../types'

/**
 * Thumbnail card mirroring Hermes' appearance-settings grid (ThemePreview +
 * label + description), with the Edit button this project exists for. The
 * same button placement is what REAPPLY.md describes adding to Hermes itself.
 */

function Thumb({ theme, mode }: { theme: DesktopTheme; mode: 'light' | 'dark' }) {
  const c = mode === 'dark' && theme.darkColors ? theme.darkColors : theme.colors
  return (
    <div className="thumb" style={{ background: c.background, borderColor: c.border }}>
      <div className="thumb__sidebar" style={{ background: c.sidebarBackground ?? c.background, borderColor: c.sidebarBorder ?? c.border }} />
      <div className="thumb__body">
        <div className="thumb__bubble thumb__bubble--user" style={{ background: c.userBubble ?? c.secondary, borderColor: c.userBubbleBorder ?? c.border }} />
        <div className="thumb__bubble" style={{ background: c.card, borderColor: c.border }}>
          <span style={{ background: c.foreground }} />
          <span style={{ background: c.mutedForeground }} />
        </div>
        <div className="thumb__composer" style={{ borderColor: c.composerRing ?? c.midground ?? c.ring, background: c.card }}>
          <i style={{ background: c.primary }} />
        </div>
      </div>
    </div>
  )
}

interface ThemeCardProps {
  theme: DesktopTheme
  mode: 'light' | 'dark'
  isDefault: boolean
  dirty: boolean
  onEdit: () => void
  onCopy: () => void
}

export default function ThemeCard({ theme, mode, isDefault, dirty, onEdit, onCopy }: ThemeCardProps) {
  return (
    <div className="theme-card">
      <Thumb mode={mode} theme={theme} />
      <div className="theme-card__meta">
        <div className="theme-card__title">
          {theme.label}
          {isDefault && <span className="tag">default</span>}
          {dirty && <span className="tag tag--dirty">edited</span>}
        </div>
        <div className="theme-card__desc">{theme.description}</div>
      </div>
      <div className="theme-card__actions">
        <button className="btn btn--primary theme-card__edit" onClick={onEdit} type="button">
          Edit theme
        </button>
        <button className="btn" onClick={onCopy} title="Duplicate this theme" type="button">
          Copy
        </button>
      </div>
    </div>
  )
}
