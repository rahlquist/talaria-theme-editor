import { useEffect } from 'react'
import type { DesktopTheme, DesktopThemeColors } from '../types'

/**
 * WYSIWYG preview: a mock Hermes desktop window (sidebar + chat thread +
 * composer) painted entirely from the theme's tokens via CSS variables —
 * the same mechanism Hermes uses (colors → `--dt-*` vars). See styles.css
 * `.preview-*` rules; every color there references a var set here.
 */

const FALLBACK = { midground: 'ring', composerRing: 'midground' } as const

function themeVars(colors: DesktopThemeColors, typography?: DesktopTheme['typography']) {
  const midground = colors.midground ?? colors.ring
  const vars: Record<string, string> = {
    '--dt-background': colors.background,
    '--dt-foreground': colors.foreground,
    '--dt-card': colors.card,
    '--dt-card-foreground': colors.cardForeground,
    '--dt-muted': colors.muted,
    '--dt-muted-foreground': colors.mutedForeground,
    '--dt-popover': colors.popover,
    '--dt-popover-foreground': colors.popoverForeground,
    '--dt-primary': colors.primary,
    '--dt-primary-foreground': colors.primaryForeground,
    '--dt-secondary': colors.secondary,
    '--dt-secondary-foreground': colors.secondaryForeground,
    '--dt-accent': colors.accent,
    '--dt-accent-foreground': colors.accentForeground,
    '--dt-border': colors.border,
    '--dt-input': colors.input,
    '--dt-ring': colors.ring,
    '--dt-midground': midground,
    '--dt-composer-ring': colors.composerRing ?? midground,
    '--dt-destructive': colors.destructive,
    '--dt-destructive-foreground': colors.destructiveForeground,
    '--dt-sidebar-background': colors.sidebarBackground ?? colors.background,
    '--dt-sidebar-border': colors.sidebarBorder ?? colors.border,
    '--dt-user-bubble': colors.userBubble ?? colors.secondary,
    '--dt-user-bubble-border': colors.userBubbleBorder ?? colors.border,
    '--dt-font-sans': typography?.fontSans ?? 'system-ui, sans-serif',
    '--dt-font-mono': typography?.fontMono ?? 'ui-monospace, monospace'
  }
  return vars as React.CSSProperties
}

/** Load the theme's fontUrl stylesheet so Google-Font previews are real. */
function useFontStylesheet(url: string | undefined) {
  useEffect(() => {
    if (!url) return
    const id = `preview-font-${url}`
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = url
    document.head.appendChild(link)
    // Keep loaded links around for the session — cheap, and avoids font
    // flashing when the user toggles between edited and committed values.
  }, [url])
}

interface PreviewPaneProps {
  theme: DesktopTheme
  mode: 'light' | 'dark'
  /** Preview-only zoom — font size is NOT part of presets.ts. */
  fontScale: number
}

export default function PreviewPane({ theme, mode, fontScale }: PreviewPaneProps) {
  const colors = mode === 'dark' && theme.darkColors ? theme.darkColors : theme.colors
  useFontStylesheet(theme.typography?.fontUrl)

  return (
    <div className="preview-window" style={{ ...themeVars(colors, theme.typography), fontSize: `${fontScale}em` }}>
      <aside className="preview-sidebar">
        <div className="preview-sidebar__title">{theme.label}</div>
        <div className="preview-sidebar__item preview-sidebar__item--active">Current session</div>
        <div className="preview-sidebar__item">Fix login bug</div>
        <div className="preview-sidebar__item">Refactor themes</div>
        <div className="preview-sidebar__item preview-sidebar__item--destructive">Delete history</div>
      </aside>
      <main className="preview-main">
        <div className="preview-thread">
          <div className="preview-msg preview-msg--user">
            Can you show me every color token this theme uses?
          </div>
          <div className="preview-msg preview-msg--assistant">
            <p>
              Sure — this bubble is a <strong>card</strong>, this is{' '}
              <span className="preview-muted-text">muted text</span>, and here's{' '}
              <a className="preview-link" href="#preview" onClick={e => e.preventDefault()}>
                a primary link
              </a>
              .
            </p>
            <pre className="preview-code">
              <code>{`const theme = '${theme.name}'  // fontMono sample\nconsole.log('0123456789 <=> !== ->')`}</code>
            </pre>
            <div className="preview-chips">
              <span className="preview-chip preview-chip--primary">primary</span>
              <span className="preview-chip preview-chip--secondary">secondary</span>
              <span className="preview-chip preview-chip--accent">accent</span>
              <span className="preview-chip preview-chip--destructive">destructive</span>
            </div>
          </div>
          <div className="preview-popover">
            <div className="preview-popover__title">Popover / menu</div>
            <div className="preview-popover__row">Settings</div>
            <div className="preview-popover__row preview-popover__row--hover">Appearance ✓</div>
          </div>
        </div>
        <div className="preview-composer">
          <span className="preview-composer__placeholder">Message Hermes… (composer ring)</span>
          <button className="preview-composer__send" type="button">
            Send
          </button>
        </div>
      </main>
    </div>
  )
}

export { FALLBACK }
