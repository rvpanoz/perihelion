import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const DATA_SERVER_URL = 'http://127.0.0.1:8787';

export default defineConfig({
  plugins: [react()],
  server: {
    // The web app never calls NASA/JPL directly; /api always goes through apps/server.
    proxy: { '/api': DATA_SERVER_URL },
  },
});
