import { useMemo, useState } from 'react'
import type { DesktopTheme } from '../types'

/**
 * "Copy theme" prompt: asks for the new theme's name (the presets.ts key,
 * normalized to a slug) and display label. Validates uniqueness against the
 * current theme list before enabling Create.
 */

const slugify = (raw: string) =>
  raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')

interface CopyDialogProps {
  source: DesktopTheme
  takenNames: string[]
  busy: boolean
  onCancel: () => void
  onCreate: (copy: DesktopTheme) => void
}

export default function CopyDialog({ source, takenNames, busy, onCancel, onCreate }: CopyDialogProps) {
  const [label, setLabel] = useState(`${source.label} Copy`)
  const [name, setName] = useState(slugify(`${source.name}-copy`))
  const [nameTouched, setNameTouched] = useState(false)

  const problem = useMemo(() => {
    if (!name) return 'Name is required.'
    if (takenNames.includes(name)) return `"${name}" already exists — pick another name.`
    return null
  }, [name, takenNames])

  const submit = () => {
    if (problem || busy) return
    // Deep-clone so later edits to the copy can't share nested palette objects.
    const clone: DesktopTheme = JSON.parse(JSON.stringify(source))
    onCreate({ ...clone, name, label: label.trim() || name, description: source.description })
  }

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal__box">
        <h3>Copy “{source.label}”</h3>
        <label className="text-field">
          <span>Display label</span>
          <input
            autoFocus
            onChange={e => {
              setLabel(e.target.value)
              if (!nameTouched) setName(slugify(e.target.value))
            }}
            onKeyDown={e => e.key === 'Enter' && submit()}
            value={label}
          />
        </label>
        <label className="text-field">
          <span>Theme name (presets.ts key — lowercase slug)</span>
          <input
            onChange={e => {
              setNameTouched(true)
              setName(slugify(e.target.value))
            }}
            onKeyDown={e => e.key === 'Enter' && submit()}
            spellCheck={false}
            value={name}
          />
        </label>
        {problem && <p className="error">{problem}</p>}
        <p className="hint">Creating the copy backs up presets.ts, writes the new theme to it, then opens the editor.</p>
        <div className="modal__actions">
          <button className="btn" disabled={busy} onClick={onCancel} type="button">
            Cancel
          </button>
          <button className="btn btn--primary" disabled={!!problem || busy} onClick={submit} type="button">
            {busy ? 'Creating…' : 'Create copy'}
          </button>
        </div>
      </div>
    </div>
  )
}
