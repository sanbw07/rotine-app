import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // Use o nome EXATO do seu repositório no GitHub entre barras
  base: '/rotine-app/', 
  plugins: [react()],
})