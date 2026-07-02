/**
 * Theme model mirrored from Hermes Agent desktop:
 *   ~/.hermes/hermes-agent/apps/desktop/src/themes/types.ts
 *
 * Kept in sync by hand — if a future Hermes version adds fields, copy the
 * interfaces here again. The editor round-trips unknown fields untouched
 * where possible, but the form only shows what these types declare.
 */

export interface DesktopThemeColors {
  background: string
  foreground: string
  card: string
  cardForeground: string
  muted: string
  mutedForeground: string
  popover: string
  popoverForeground: string
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  accent: string
  accentForeground: string
  border: string
  input: string
  /** Generic focus ring — buttons, inputs, etc. */
  ring: string
  /** Brand-accent stroke. Falls back to `ring`. */
  midground?: string
  /** Auto-derived from `midground` luminance when omitted. */
  midgroundForeground?: string
  /** Composer outline / focus color. Falls back to `midground`. */
  composerRing?: string
  destructive: string
  destructiveForeground: string
  sidebarBackground?: string
  sidebarBorder?: string
  userBubble?: string
  userBubbleBorder?: string
}

export interface DesktopThemeTypography {
  fontSans: string
  fontMono: string
  /** Google/Bunny/self-hosted font stylesheet URL. */
  fontUrl?: string
}

export interface DesktopTerminalPalette {
  foreground?: string
  cursor?: string
  selectionBackground?: string
  black?: string
  red?: string
  green?: string
  yellow?: string
  blue?: string
  magenta?: string
  cyan?: string
  white?: string
  brightBlack?: string
  brightRed?: string
  brightGreen?: string
  brightYellow?: string
  brightBlue?: string
  brightMagenta?: string
  brightCyan?: string
  brightWhite?: string
}

export interface DesktopTheme {
  name: string
  label: string
  description: string
  colors: DesktopThemeColors
  darkColors?: DesktopThemeColors
  typography?: Partial<DesktopThemeTypography>
  terminal?: DesktopTerminalPalette
  darkTerminal?: DesktopTerminalPalette
}

/** Required color keys, in display order (mirrors DesktopThemeColors). */
export const REQUIRED_COLOR_KEYS = [
  'background',
  'foreground',
  'card',
  'cardForeground',
  'muted',
  'mutedForeground',
  'popover',
  'popoverForeground',
  'primary',
  'primaryForeground',
  'secondary',
  'secondaryForeground',
  'accent',
  'accentForeground',
  'border',
  'input',
  'ring',
  'destructive',
  'destructiveForeground'
] as const

export const OPTIONAL_COLOR_KEYS = [
  'midground',
  'midgroundForeground',
  'composerRing',
  'sidebarBackground',
  'sidebarBorder',
  'userBubble',
  'userBubbleBorder'
] as const

export const ALL_COLOR_KEYS = [...REQUIRED_COLOR_KEYS, ...OPTIONAL_COLOR_KEYS] as const

export type ColorKey = (typeof ALL_COLOR_KEYS)[number]

/** Payload shape served by GET /api/themes. */
export interface ThemesPayload {
  themes: DesktopTheme[]
  defaultSkinName: string
  presetsPath: string
}
