import { expect, it } from 'vitest'

import { check, describe, failures } from '../contrast/check.ts'
import { dark, light, pairs } from './contrastPairs.ts'

it('meets every contrast target in every theme', () => {
  for (const theme of [light, dark]) {
    expect(
      failures(check(theme, pairs)).map(result => describe(result)),
    ).toEqual([])
  }
})
