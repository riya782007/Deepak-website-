import {startConsole} from './console.js';

// Live mode needs all three values at build time (see admin/README.md); otherwise demo mode.
const env = import.meta.env;
const live = {api: env.VITE_CONSOLE_API_URL, region: env.VITE_AWS_REGION, clientId: env.VITE_COGNITO_CLIENT_ID};

// /demo/ is a review copy: always sample data in the browser, never the live records.
const review = location.pathname.startsWith('/demo');

(async () => {
  if (!review && live.api && live.region && live.clientId) {
    const {awsBackend} = await import('./store-aws.js');
    const backend = await awsBackend(live);
    if (backend) startConsole(backend);
  } else {
    const {demoBackend} = await import('./store-demo.js');
    startConsole(demoBackend({review}));
  }
})();
