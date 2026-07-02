/**
 * Node-side IO for the Hermes presets file.
 *
 * Load:  transpile presets.ts with esbuild and import it, so we get the
 *        *evaluated* theme objects (color-mix() helpers already resolved to
 *        their string values). No hand-rolled TS parsing.
 * Save:  back up the original as yyyyddmm-epoch-presets.ts alongside it,
 *        then regenerate presets.ts with the same public exports Hermes
 *        consumes (EMOJI_FALLBACK, DEFAULT_TYPOGRAPHY, per-theme consts,
 *        BUILTIN_THEMES, BUILTIN_THEME_LIST, DEFAULT_SKIN_NAME).
 *
 * The ONLY file this module ever writes inside ~/.hermes is presets.ts and
 * its timestamped backups in the same directory.
 */

import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { transform } from 'esbuild'
import type { DesktopTheme, ThemesPayload } from '../types'

export const PRESETS_PATH = path.join(
  os.homedir(),
  '.hermes/hermes-agent/apps/desktop/src/themes/presets.ts'
)

export async function loadThemes(presetsPath: string = PRESETS_PATH): Promise<ThemesPayload> {
  const source = await fs.readFile(presetsPath, 'utf8')
  // Type-only imports are erased by the transform; presets.ts has no runtime
  // imports, so the transpiled module can be imported from a data: URL.
  const { code } = await transform(source, { loader: 'ts', format: 'esm' })
  const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
  const mod = await import(/* @vite-ignore */ moduleUrl)
  return {
    themes: mod.BUILTIN_THEME_LIST as DesktopTheme[],
    defaultSkinName: (mod.DEFAULT_SKIN_NAME as string) ?? 'nous',
    presetsPath
  }
}

/** yyyyddmm-epoch-presets.ts — per the requested backup naming scheme. */
export function backupFilename(now: Date = new Date()): string {
  const yyyy = now.getFullYear()
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  return `${yyyy}${dd}${mm}-${now.getTime()}-presets.ts`
}

/** Copy the current presets.ts to its timestamped backup; returns backup path. */
export async function backupPresets(presetsPath: string = PRESETS_PATH, now: Date = new Date()): Promise<string> {
  const backupPath = path.join(path.dirname(presetsPath), backupFilename(now))
  await fs.copyFile(presetsPath, backupPath)
  return backupPath
}

/** Matches only files this tool created: yyyyddmm-epoch-presets.ts */
const BACKUP_RE = /^(\d{8})-(\d+)-presets\.ts$/

/**
 * Enforce the backup retention limit: keep the `maxBackups` newest
 * (by epoch in the filename), delete the rest. Only files matching the
 * backup pattern are ever touched. Returns the deleted filenames.
 */
export async function pruneBackups(presetsPath: string = PRESETS_PATH, maxBackups: number): Promise<string[]> {
  if (!Number.isFinite(maxBackups) || maxBackups < 1) maxBackups = 1
  const dir = path.dirname(presetsPath)
  const backups = (await fs.readdir(dir))
    .map(f => ({ f, m: BACKUP_RE.exec(f) }))
    .filter((x): x is { f: string; m: RegExpExecArray } => x.m !== null)
    .sort((a, b) => Number(b.m[2]) - Number(a.m[2])) // newest first
  const excess = backups.slice(Math.floor(maxBackups)).map(x => x.f)
  await Promise.all(excess.map(f => fs.unlink(path.join(dir, f))))
  return excess
}

const quote = (value: string) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

function serializeRecord(record: Record<string, unknown>, indent: string): string {
  const lines = Object.entries(record)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${indent}  ${key}: ${quote(String(value))}`)
  return `{\n${lines.join(',\n')}\n${indent}}`
}

/** `name` → a safe TS identifier for the exported const, e.g. `nous` → `nousTheme`. */
export function themeIdentifier(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9_$]/g, '_').replace(/^(\d)/, '_$1')
  return `${cleaned}Theme`
}

export function serializeTheme(theme: DesktopTheme): string {
  const parts: string[] = [
    `  name: ${quote(theme.name)}`,
    `  label: ${quote(theme.label)}`,
    `  description: ${quote(theme.description)}`,
    `  colors: ${serializeRecord(theme.colors as unknown as Record<string, unknown>, '  ')}`
  ]
  if (theme.darkColors) parts.push(`  darkColors: ${serializeRecord(theme.darkColors as unknown as Record<string, unknown>, '  ')}`)
  if (theme.typography && Object.values(theme.typography).some(v => v !== undefined))
    parts.push(`  typography: ${serializeRecord(theme.typography as Record<string, unknown>, '  ')}`)
  if (theme.terminal) parts.push(`  terminal: ${serializeRecord(theme.terminal as Record<string, unknown>, '  ')}`)
  if (theme.darkTerminal) parts.push(`  darkTerminal: ${serializeRecord(theme.darkTerminal as Record<string, unknown>, '  ')}`)
  return `export const ${themeIdentifier(theme.name)}: DesktopTheme = {\n${parts.join(',\n')}\n}`
}

/**
 * Regenerate the full presets.ts. All values are written as resolved string
 * literals (the original file's color-mix()/tint helper *outputs* are
 * preserved verbatim as strings — CSS evaluates color-mix at paint time, so
 * rendering is identical).
 */
export function generatePresetsFile(themes: DesktopTheme[], defaultSkinName: string): string {
  const header = `/**
 * Built-in desktop themes. Names match the CLI skins / dashboard presets.
 * Add new themes here — no code changes needed elsewhere.
 *
 * NOTE: this file was regenerated by hermes-theme-editor
 * (~/projects/theme_editor_claude). Helper constants are preserved; theme
 * color values are written as resolved literals. A timestamped backup of the
 * previous version (yyyyddmm-epoch-presets.ts) sits in this directory.
 */

import type { DesktopTheme, DesktopThemeTypography } from './types'

// Color-emoji fonts to append to every stack as a last resort. None of the UI
// text/mono fonts carry emoji glyphs, so without this emoji render as tofu
// boxes on platforms whose default text font lacks them (e.g. Linux/#40364).
// Covers macOS, Windows, Linux, plus the \`emoji\` generic for anything else.
export const EMOJI_FALLBACK = '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", emoji'

const SYSTEM_SANS =
  '"Segoe WPC", "Segoe UI", -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, sans-serif, ' +
  EMOJI_FALLBACK

const SYSTEM_MONO =
  '"Cascadia Code", "JetBrains Mono", "SF Mono", ui-monospace, Menlo, Monaco, Consolas, monospace, ' + EMOJI_FALLBACK

export const DEFAULT_TYPOGRAPHY: DesktopThemeTypography = { fontSans: SYSTEM_SANS, fontMono: SYSTEM_MONO }
`

  const themeBlocks = themes.map(serializeTheme).join('\n\n')

  const registry = `export const BUILTIN_THEMES: Record<string, DesktopTheme> = {
${themes.map(t => `  ${/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(t.name) ? t.name : quote(t.name)}: ${themeIdentifier(t.name)}`).join(',\n')}
}

export const BUILTIN_THEME_LIST = Object.values(BUILTIN_THEMES)

/** Skin used when nothing is persisted or the persisted name is retired. */
export const DEFAULT_SKIN_NAME = ${quote(defaultSkinName)}
`

  return `${header}\n${themeBlocks}\n\n${registry}`
}

/**
 * Backup, write the regenerated file, then enforce the retention limit.
 * Returns the backup path and any pruned backup filenames.
 */
export async function saveThemes(
  themes: DesktopTheme[],
  defaultSkinName: string,
  presetsPath: string = PRESETS_PATH,
  maxBackups?: number
): Promise<{ backupPath: string; pruned: string[] }> {
  const backupPath = await backupPresets(presetsPath)
  await fs.writeFile(presetsPath, generatePresetsFile(themes, defaultSkinName), 'utf8')
  const pruned = maxBackups !== undefined ? await pruneBackups(presetsPath, maxBackups) : []
  return { backupPath, pruned }
}
