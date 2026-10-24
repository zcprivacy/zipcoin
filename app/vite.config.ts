import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// snarkjs and the Privacy Pools SDK expect a few Node globals in the browser.
export default defineConfig({
  plugins: [react(), nodePolyfills({ globals: { Buffer: true, process: true }, protocolImports: true })],
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 4000,
  },
  server: { port: 5173 },
  optimizeDeps: { esbuildOptions: { target: 'es2022' } },
});
