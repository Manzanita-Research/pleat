import { defaultClientConditions, defaultServerConditions, defineConfig } from 'vite'

import { foldkit } from '@foldkit/vite-plugin'

const SOURCE_CONDITION = '@pleat/source'

export default defineConfig({
  plugins: [
    foldkit({
      ssr: {
        serverEntry: '/src/entry.server.ts',
        clientEntry: '/src/entry.ts',
        build: { prerender: {} },
      },
    }),
  ],
  resolve: { conditions: [SOURCE_CONDITION, ...defaultClientConditions] },
  ssr: { resolve: { conditions: [SOURCE_CONDITION, ...defaultServerConditions] } },
})
