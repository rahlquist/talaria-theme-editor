import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * One theme color token: label + swatch + native color picker + free-text
 * input. Hermes color values aren't always hex (`color-mix(...)`,
 * `transparent` mixes), so:
 *   - the text input is the source of truth and accepts any CSS color string
 *   - the native <input type="color"> needs #rrggbb, so non-hex values are
 *     resolved to hex through a canvas probe just to seed the picker; picking
 *     a color overwrites the token with plain hex.
 */

/** Resolve any CSS color string to #rrggbb (alpha dropped), or null. */
export function cssColorToHex(value: string): string | null {
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value.toLowerCase()
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    const [r, g, b] = value.slice(1)
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#000'
  ctx.fillStyle = value
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  const hex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${hex(r)}${hex(g)}${hex(b)}`
}

interface ColorFieldProps {
  label: string
  value: string | undefined
  /** Unset optional tokens render as an "add" affordance. */
  optional?: boolean
  onChange: (value: string | undefined) => void
}

export default function ColorField({ label, value, optional, onChange }: ColorFieldProps) {
  const [text, setText] = useState(value ?? '')
  const lastPropValue = useRef(value)

  // Sync external changes (revert, theme switch) into the local text state.
  useEffect(() => {
    if (value !== lastPropValue.current) {
      lastPropValue.current = value
      setText(value ?? '')
    }
  }, [value])

  const hexForPicker = useMemo(() => cssColorToHex(text || '#000000') ?? '#000000', [text])
  const isComputed = value !== undefined && !/^#[0-9a-fA-F]{3,8}$/.test(value)

  if (optional && value === undefined) {
    return (
      <div className="color-field color-field--unset">
        <span className="color-field__label">{label}</span>
        <button className="color-field__add" onClick={() => onChange(hexForPicker)} type="button">
          + set
        </button>
      </div>
    )
  }

  const commitText = (next: string) => {
    setText(next)
    lastPropValue.current = next
    onChange(next)
  }

  return (
    <div className="color-field" title={isComputed ? `Computed value: ${value}` : undefined}>
      <span className="color-field__label">{label}</span>
      <span className="color-field__swatch" style={{ background: text || 'transparent' }}>
        <input
          aria-label={`${label} color picker`}
          onChange={event => commitText(event.target.value)}
          type="color"
          value={hexForPicker}
        />
      </span>
      <input
        aria-label={`${label} color value`}
        className="color-field__text"
        onChange={event => commitText(event.target.value)}
        spellCheck={false}
        type="text"
        value={text}
      />
      {optional && (
        <button
          aria-label={`Unset ${label}`}
          className="color-field__unset"
          onClick={() => {
            setText('')
            lastPropValue.current = undefined
            onChange(undefined)
          }}
          title="Unset (use fallback)"
          type="button"
        >
          ×
        </button>
      )}
    </div>
  )
}
