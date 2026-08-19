import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3870,
    // écoute sur le réseau local : indispensable pour tester depuis l'iPhone et l'iPad
    host: true,
    strictPort: true,
  },
})
