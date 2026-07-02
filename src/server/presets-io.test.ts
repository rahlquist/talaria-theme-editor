import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  PRESETS_PATH,
  backupFilename,
  generatePresetsFile,
  loadThemes,
  pruneBackups,
  resolveBackupDir,
  saveThemes,
  themeIdentifier
} from './presets-io'
import type { DesktopTheme } from '../types'

describe('backupFilename', () => {
  it('uses the yyyyddmm-epoch-presets.ts scheme (year, DAY, month)', () => {
    const d = new Date(2026, 6, 2, 12, 0, 0) // 2 Jul 2026
    expect(backupFilename(d)).toBe(`20260207-${d.getTime()}-presets.ts`)
  })

  it('zero-pads day and month', () => {
    const d = new Date(2027, 0, 9)
    expect(backupFilename(d)).toBe(`20270901-${d.getTime()}-presets.ts`)
  })
})

describe('themeIdentifier', () => {
  it('appends Theme to simple names', () => {
    expect(themeIdentifier('nous')).toBe('nousTheme')
  })
  it('sanitizes non-identifier characters and leading digits', () => {
    expect(themeIdentifier('my-cool theme')).toBe('my_cool_themeTheme')
    expect(themeIdentifier('2077')).toBe('_2077Theme')
  })
})

describe('load → save round trip (temp copy, never the real file)', () => {
  let dir: string
  let presets: string

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'theme-editor-test-'))
    presets = path.join(dir, 'presets.ts')
    await fs.copyFile(PRESETS_PATH, presets)
  })

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true })
  })

  it('loads all built-in themes with evaluated values', async () => {
    const { themes, defaultSkinName } = await loadThemes(presets)
    expect(themes.length).toBeGreaterThanOrEqual(6)
    const names = themes.map(t => t.name)
    for (const n of ['nous', 'midnight', 'ember', 'mono', 'cyberpunk', 'slate']) expect(names).toContain(n)
    expect(defaultSkinName).toBe('nous')
    const nous = themes.find(t => t.name === 'nous')!
    expect(nous.colors.muted).toContain('color-mix')
    expect(nous.darkColors?.background).toMatch(/^#/)
  })

  it('regenerated file reloads with identical data and preserves contract exports', async () => {
    const original = await loadThemes(presets)
    const { backupPath } = await saveThemes(original.themes, original.defaultSkinName, presets)

    // backup exists next to the file and matches the pre-save content
    expect(path.dirname(backupPath)).toBe(dir)
    await fs.access(backupPath)

    const reloaded = await loadThemes(presets)
    expect(reloaded.themes).toEqual(original.themes)
    expect(reloaded.defaultSkinName).toBe(original.defaultSkinName)

    const text = await fs.readFile(presets, 'utf8')
    for (const contract of [
      'export const EMOJI_FALLBACK',
      'export const DEFAULT_TYPOGRAPHY',
      'export const nousTheme',
      'export const BUILTIN_THEMES',
      'export const BUILTIN_THEME_LIST',
      'export const DEFAULT_SKIN_NAME'
    ]) {
      expect(text).toContain(contract)
    }
  })

  it('prunes only the oldest backups beyond the limit, never other files', async () => {
    // Five fake backups, epochs 1000..5000, plus a decoy that must survive.
    for (const epoch of [1000, 2000, 3000, 4000, 5000]) {
      await fs.writeFile(path.join(dir, `20260207-${epoch}-presets.ts`), '// backup')
    }
    await fs.writeFile(path.join(dir, 'notes-presets.ts.txt'), 'decoy')

    const pruned = await pruneBackups(presets, 2)
    expect(pruned.sort()).toEqual(['20260207-1000-presets.ts', '20260207-2000-presets.ts', '20260207-3000-presets.ts'])

    const left = await fs.readdir(dir)
    expect(left).toContain('20260207-4000-presets.ts')
    expect(left).toContain('20260207-5000-presets.ts')
    expect(left).toContain('notes-presets.ts.txt')
    expect(left).toContain('presets.ts')
  })

  it('saveThemes enforces maxBackups across repeated saves', async () => {
    const { themes, defaultSkinName } = await loadThemes(presets)
    for (let i = 0; i < 5; i++) {
      await saveThemes(themes, defaultSkinName, presets, { maxBackups: 3 })
      await new Promise(r => setTimeout(r, 2)) // distinct epoch filenames
    }
    const backups = (await fs.readdir(dir)).filter(f => /^\d{8}-\d+-presets\.ts$/.test(f))
    expect(backups.length).toBe(3)
  })

  it('clamps a nonsensical limit to keeping at least one backup', async () => {
    await fs.writeFile(path.join(dir, `20260207-1000-presets.ts`), '// backup')
    await fs.writeFile(path.join(dir, `20260207-2000-presets.ts`), '// backup')
    await pruneBackups(presets, 0)
    const backups = (await fs.readdir(dir)).filter(f => /^\d{8}-\d+-presets\.ts$/.test(f))
    expect(backups).toEqual(['20260207-2000-presets.ts'])
  })

  it('writes backups to a custom directory (created on demand) and prunes there', async () => {
    const custom = path.join(dir, 'my/backups') // does not exist yet
    const { themes, defaultSkinName } = await loadThemes(presets)
    for (let i = 0; i < 3; i++) {
      const { backupPath } = await saveThemes(themes, defaultSkinName, presets, { maxBackups: 2, backupDir: custom })
      expect(path.dirname(backupPath)).toBe(custom)
      await new Promise(r => setTimeout(r, 2))
    }
    const inCustom = (await fs.readdir(custom)).filter(f => /^\d{8}-\d+-presets\.ts$/.test(f))
    expect(inCustom.length).toBe(2)
    // nothing was written next to presets.ts
    const inMain = (await fs.readdir(dir)).filter(f => /^\d{8}-\d+-presets\.ts$/.test(f))
    expect(inMain.length).toBe(0)
  })

  it('refuses to write an empty theme list', async () => {
    await expect(saveThemes([], 'nous', presets)).rejects.toThrow(/zero themes/)
  })

  it('persists an edit', async () => {
    const { themes, defaultSkinName } = await loadThemes(presets)
    const edited = themes.map(t =>
      t.name === 'mono' ? { ...t, colors: { ...t.colors, primary: '#ff00ff' }, description: 'edited!' } : t
    )
    await saveThemes(edited, defaultSkinName, presets)
    const reloaded = await loadThemes(presets)
    const mono = reloaded.themes.find(t => t.name === 'mono')!
    expect(mono.colors.primary).toBe('#ff00ff')
    expect(mono.description).toBe('edited!')
  })
})

describe('resolveBackupDir', () => {
  it('defaults to the presets.ts directory', () => {
    expect(resolveBackupDir('/a/b/presets.ts')).toBe('/a/b')
    expect(resolveBackupDir('/a/b/presets.ts', '   ')).toBe('/a/b')
  })
  it('expands a leading ~', () => {
    expect(resolveBackupDir('/a/b/presets.ts', '~/backups')).toBe(path.join(os.homedir(), 'backups'))
  })
  it('resolves relative paths', () => {
    expect(path.isAbsolute(resolveBackupDir('/a/b/presets.ts', 'rel/dir'))).toBe(true)
  })
})

describe('generatePresetsFile', () => {
  const tiny: DesktopTheme = {
    name: 'tiny',
    label: "Tiny 'quoted'",
    description: 'x',
    colors: {
      background: '#000000', foreground: '#ffffff', card: '#111111', cardForeground: '#ffffff',
      muted: '#222222', mutedForeground: '#888888', popover: '#111111', popoverForeground: '#ffffff',
      primary: '#ffffff', primaryForeground: '#000000', secondary: '#333333', secondaryForeground: '#cccccc',
      accent: '#222222', accentForeground: '#dddddd', border: '#2a2a2a', input: '#2a2a2a', ring: '#999999',
      destructive: '#aa4040', destructiveForeground: '#fef2f2'
    }
  }

  it('escapes quotes and omits undefined optional sections', () => {
    const out = generatePresetsFile([tiny], 'tiny')
    expect(out).toContain("label: 'Tiny \\'quoted\\''")
    expect(out).not.toContain('darkColors')
    expect(out).not.toContain('typography:')
    expect(out).toContain("export const DEFAULT_SKIN_NAME = 'tiny'")
  })
})
