import {defineConfig} from 'vite';
import {resolve} from 'node:path';

// Two entry points: the public website and the staff admin console (/admin/).
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1000, // Excel and PDF libraries load only when someone exports or prints
    rollupOptions: {
      input: {main: resolve(import.meta.dirname, 'index.html'), admin: resolve(import.meta.dirname, 'admin/index.html')}
    }
  }
});
