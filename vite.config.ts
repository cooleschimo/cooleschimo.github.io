import { defineConfig } from 'vite'
import { existsSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// User site (cooleschimo.github.io) → served from the domain root.
// Chimin's handwriting font is optional: drop public/fonts/chimin-hand.woff2 in and rebuild.
const hasHandFont = existsSync(new URL('./public/fonts/chimin-hand.woff2', import.meta.url))

export default defineConfig({
  base: '/',
  define: { __HAS_HAND_FONT__: JSON.stringify(hasHandFont) },
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2022',
    sourcemap: false,
  },
})
