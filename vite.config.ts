import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '', // Isso força o Vite a usar caminhos relativos (./) em tudo
  plugins: [react()],
})