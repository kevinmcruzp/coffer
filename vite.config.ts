import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // The desktop shell loads the dev server from this exact port and owns src-tauri.
  server: {
    port: 5173,
    strictPort: true,
    watch: { ignored: ['**/src-tauri/**'] },
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
})
