import {startConsole} from './console.js';

// Live mode when the database is configured at build time; demo mode otherwise.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

(async () => {
  if (url && key) {
    const {liveBackend} = await import('./store-supabase.js');
    const backend = await liveBackend(url, key);
    if (backend) startConsole(backend);
  } else {
    const {demoBackend} = await import('./store-demo.js');
    startConsole(demoBackend());
  }
})();
