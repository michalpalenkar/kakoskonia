import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import levelsPlugin from './vite-plugin-levels'

export default defineConfig({
  base: '/kakoskonia/',
  plugins: [
    react(),
    tailwindcss(),
    levelsPlugin(),
  ],
})
