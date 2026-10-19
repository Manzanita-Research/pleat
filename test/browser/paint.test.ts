import fc from 'fast-check'
import type { Browser } from 'playwright-core'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import { Paint } from '@pleat/core'

import { launch } from './chromium.ts'

// The claim under test: Paint.over, Paint.mix and Paint.oklch compute the color Chromium
// paints for the same CSS. The browser computes one side, so Paint can't agree with itself.
// Where a result falls outside sRGB they part ways on purpose: Chromium clips each channel,
// and Paint lowers chroma to keep lightness and hue. So OKLab and OKLCH samples stay muted
// enough to fit.

const SAMPLES = 300
const SEED = 20_261_019

let browser: Browser

beforeAll(async () => {
  browser = await launch()
})

afterAll(async () => {
  await browser?.close()
})

// NOTE: at these lightnesses sRGB holds every hue to well past this chroma.
const muted = fc
  .tuple(
    fc.double({ min: 0.3, max: 0.85, noNaN: true }),
    fc.double({ min: 0, max: 0.04, noNaN: true }),
    fc.integer({ min: 0, max: 359 }),
  )
  .map(([lightness, chroma, hue]) => Paint.oklch(lightness, chroma, hue))

const channel = fc.integer({ min: 0, max: 255 })
const hexColor = fc
  .tuple(channel, channel, channel)
  .map(rgb => `#${rgb.map(value => value.toString(16).padStart(2, '0')).join('')}`)

type Sample = Readonly<{ css: string; expected: string }>

// NOTE: a canvas pixel is the color as Chromium paints it in sRGB, rounded to
// bytes, which is exactly what Paint's hex output claims to be.
const painted = async (
  samples: ReadonlyArray<Sample>,
): Promise<ReadonlyArray<string>> => {
  const page = await browser.newPage()
  const colors = await page.evaluate(
    cssColors =>
      cssColors.map(color => {
        const canvas = document.createElement('canvas')
        canvas.width = 1
        canvas.height = 1
        const context = canvas.getContext('2d', { colorSpace: 'srgb' })
        if (context === null) {
          return 'no canvas'
        }
        context.fillStyle = color
        context.fillRect(0, 0, 1, 1)
        const [red = 0, green = 0, blue = 0] = context.getImageData(0, 0, 1, 1).data
        return `#${[red, green, blue].map(value => value.toString(16).padStart(2, '0')).join('')}`
      }),
    samples.map(sample => sample.css),
  )
  await page.close()
  return colors
}

// NOTE: one byte of difference per channel is rounding, not disagreement.
const isClose = (left: string, right: string): boolean =>
  [1, 3, 5].every(
    at =>
      Math.abs(
        Number.parseInt(left.slice(at, at + 2), 16) -
          Number.parseInt(right.slice(at, at + 2), 16),
      ) <= 1,
  )

describe('Paint in Chromium', () => {
  test('lays one color over another as color-mix in srgb does', async () => {
    const samples = fc
      .sample(fc.tuple(hexColor, hexColor, fc.integer({ min: 0, max: 100 })), {
        numRuns: SAMPLES,
        seed: SEED,
      })
      .map(([color, background, amount]) => ({
        css: `color-mix(in srgb, ${background}, ${color} ${amount}%)`,
        expected: Paint.over(color, background, amount),
      }))
    const colors = await painted(samples)
    const disagreements = samples.filter(
      (sample, index) => !isClose(colors[index] ?? '', sample.expected),
    )
    expect(disagreements.map(sample => `${sample.css}: ${sample.expected}`)).toEqual([])
  })

  test('mixes in OKLab as color-mix in oklab does', async () => {
    const samples = fc
      .sample(fc.tuple(muted, muted, fc.integer({ min: 0, max: 100 })), {
        numRuns: SAMPLES,
        seed: SEED + 1,
      })
      .map(([base, other, amount]) => ({
        css: `color-mix(in oklab, ${base}, ${other} ${amount}%)`,
        expected: Paint.mix(base, other, amount),
      }))
    const colors = await painted(samples)
    const disagreements = samples.filter(
      (sample, index) => !isClose(colors[index] ?? '', sample.expected),
    )
    expect(disagreements.map(sample => `${sample.css}: ${sample.expected}`)).toEqual([])
  })

  test('makes the same OKLCH colors', async () => {
    const samples = fc
      .sample(
        fc.tuple(
          fc.double({ min: 0.3, max: 0.85, noNaN: true }),
          fc.double({ min: 0, max: 0.04, noNaN: true }),
          fc.integer({ min: 0, max: 359 }),
        ),
        { numRuns: SAMPLES, seed: SEED + 2 },
      )
      .map(([lightness, chroma, hue]) => ({
        css: `oklch(${lightness} ${chroma} ${hue})`,
        expected: Paint.oklch(lightness, chroma, hue),
      }))
    const colors = await painted(samples)
    const disagreements = samples.filter(
      (sample, index) => !isClose(colors[index] ?? '', sample.expected),
    )
    expect(disagreements.map(sample => `${sample.css}: ${sample.expected}`)).toEqual([])
  })
})
