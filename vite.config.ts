import { defineConfig } from 'vite'

// Relative base so the build works from itch.io and GitHub Pages sub-paths.
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 2000 },
})
