import type { DesktopTheme } from '../types'

/** Repo #1 look: left rail of theme cards with a swatch strip + actions. */
export default function ThemeList({
  themes,
  selectedName,
  isDefault,
  dirtyNames,
  onSelect,
  onCopy,
  onDelete,
}: {
  themes: DesktopTheme[]
  selectedName: string | null
  isDefault: (name: string) => boolean
  dirtyNames: Set<string>
  onSelect: (name: string) => void
  onCopy: (name: string) => void
  onDelete: (name: string) => void
}) {
  const strip = (t: DesktopTheme) =>
    (['primary', 'secondary', 'accent', 'background', 'foreground'] as const)
      .map(k => t.colors?.[k] || '#888')
      .slice(0, 5)

  return (
    <div className="theme-grid-panel">
      <h2 className="panel-title">Themes ({themes.length})</h2>
      <div className="theme-grid">
        {themes.map(t => (
          <div
            key={t.name}
            className={`theme-card ${selectedName === t.name ? 'active' : ''}`}
            onClick={() => onSelect(t.name)}
          >
            <div className="theme-card-header">
              <div className="theme-swatch-strip">
                {strip(t).map((c, i) => (
                  <div key={i} className="theme-swatch" style={{ background: c }} title={c} />
                ))}
              </div>
              <span className="theme-card-title">{t.label || t.name}</span>
            </div>
            <div className="theme-card-desc">{t.description}</div>
            {isDefault(t.name) && <span className="card-tag card-tag--default">default</span>}
            {dirtyNames.has(t.name) && <span className="card-tag card-tag--dirty">edited</span>}
            <div className="theme-card-actions" onClick={e => e.stopPropagation()}>
              <button className="btn btn-sm btn-accent" onClick={() => onSelect(t.name)}>
                ✏️ Edit
              </button>
              <button className="btn btn-sm" onClick={() => onCopy(t.name)}>
                📋 Copy
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => onDelete(t.name)}
                disabled={themes.length <= 1}
                title={themes.length <= 1 ? 'Cannot remove the last theme' : ''}
              >
                🗑️ Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
