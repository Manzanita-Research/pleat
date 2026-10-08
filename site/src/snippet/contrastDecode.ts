import { decodeTheme } from '../contrast/check.ts'
import { pairs, tokens } from './contrastPairs.ts'

// Theme.decode's checks, plus every pair's contrast target. Inside,
// it is Theme.schema(tokens) with one more Schema check.
const decodeBrandTheme = decodeTheme(tokens, pairs)

// A model's palette with pale muted text fails the way a malformed
// color would, with the failure at the token's path:
//
//   Muted text is Lc 42; the target for other content text is
//   Lc 60 (APCA)
//     at ["color"]["muted"]
const rejected = decodeBrandTheme({
  color: {
    surface: 'oklch(99% 0.005 85)',
    ink: 'oklch(24% 0.02 50)',
    muted: 'oklch(75% 0.02 58)',
    accent: 'oklch(52% 0.155 34)',
    onAccent: 'oklch(98.5% 0.01 80)',
    line: 'oklch(85% 0.015 72)',
  },
})
