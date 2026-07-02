import { describe, expect, it } from 'vitest'
import { cssColorToHex } from './ColorField'

// Pure (non-canvas) paths only — canvas probing needs a real browser.
describe('cssColorToHex', () => {
  it('passes through 6-digit hex, lowercased', () => {
    expect(cssColorToHex('#0053FD')).toBe('#0053fd')
  })
  it('expands 3-digit hex', () => {
    expect(cssColorToHex('#fa0')).toBe('#ffaa00')
  })
  it('returns null for computed colors without a DOM', () => {
    expect(cssColorToHex('color-mix(in srgb, #0053FD 5%, #FFFFFF)')).toBeNull()
  })
})
