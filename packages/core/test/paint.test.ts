import fc from 'fast-check'
import { describe, expect, test } from 'vitest'

import { Paint } from '../src/index.ts'

const channel = fc.integer({ min: 0, max: 255 })
const hexColor = fc
  .tuple(channel, channel, channel)
  .map(rgb => `#${rgb.map(value => value.toString(16).padStart(2, '0')).join('')}`)

describe('Paint', () => {
  test('reads hex, rgb(), oklab(), and oklch() colors', () => {
    expect(Paint.hex('#ABC')).toBe('#aabbcc')
    expect(Paint.hex('rgb(134 70 156)')).toBe('#86469c')
    expect(Paint.hex('oklch(1 0 0)')).toBe('#ffffff')
    expect(Paint.hex('oklch(0% 0 0)')).toBe('#000000')
    expect(Paint.hex('oklab(0.5 0 0)')).toBe(Paint.oklch(0.5, 0, 0))
  })

  test('refuses colors it would have to guess at', () => {
    expect(() => Paint.hex('rebeccapurple')).toThrow("Paint can't read")
    expect(() => Paint.hex('var(--ink)')).toThrow("Paint can't read")
    expect(() => Paint.hex('#11223344')).toThrow("Paint can't read")
    expect(() => Paint.over('#fff', '#000', 120)).toThrow('from 0 to 100')
  })

  test('round-trips every sRGB color through OKLab', () => {
    fc.assert(fc.property(hexColor, color => Paint.mix(color, color, 50) === color))
  })

  test('lays a color over another the way color-mix in srgb does', () => {
    expect(Paint.over('#000000', '#ffffff', 50)).toBe('#808080')
    expect(Paint.over('#553364', '#f9f5eb', 0)).toBe('#f9f5eb')
    expect(Paint.over('#553364', '#f9f5eb', 100)).toBe('#553364')
  })

  test('lowers chroma, not lightness, when sRGB has no room for it', () => {
    expect(Paint.oklch(0.5, 0.13, 242)).toBe('#0069a0')
    expect(Paint.hex('oklch(50% 0.13 242)')).toBe('#0069a0')
    expect(Paint.oklch(0.5, 0.13, 23)).toBe('#a03f3f')
    const gray = Paint.oklch(0.5, 0, 0)
    expect(Paint.contrast(Paint.oklch(0.5, 0.4, 242), '#ffffff')).toBeCloseTo(
      Paint.contrast(gray, '#ffffff'),
      -1,
    )
  })

  test('measures APCA contrast either way round', () => {
    expect(Paint.contrast('#000000', '#ffffff')).toBeCloseTo(106.04, 1)
    expect(Paint.contrast('#ffffff', '#000000')).toBeCloseTo(107.88, 1)
    expect(Paint.contrast('#888888', '#888888')).toBe(0)
  })

  test('fades a color to exactly the contrast asked for', () => {
    fc.assert(
      fc.property(hexColor, fc.integer({ min: 30, max: 90 }), (color, target) => {
        const faded = Paint.fade(color, '#f9f5eb', target)
        const reached = Paint.contrast(faded, '#f9f5eb')
        return Paint.contrast(color, '#f9f5eb') <= target
          ? faded === Paint.hex(color)
          : reached >= target - 1 && reached <= target + 1.5
      }),
    )
  })

  test('picks the candidate that reads best', () => {
    expect(Paint.mostLegible('#86469c', ['#f9f5eb', '#553364'])).toBe('#f9f5eb')
    expect(Paint.mostLegible('#f4c5ff', ['#19161d', '#fff3ff'])).toBe('#19161d')
    expect(() => Paint.mostLegible('#fff', [])).toThrow('at least one candidate')
  })
})
