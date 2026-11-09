import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relativo para que funcione en GitHub Pages o en cualquier subcarpeta
export default defineConfig({
  base: './',
  plugins: [react()],
  test: { environment: 'node' },
} as any);
