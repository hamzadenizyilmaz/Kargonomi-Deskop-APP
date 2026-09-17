import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

// The dev server injects stylesheets as <style> elements, so only `vite`
// (serve) relaxes style-src for them; built pages keep the strict policy.
const devStylePolicy: Plugin = {
  name: 'kargonomi-dev-style-policy',
  apply: 'serve',
  transformIndexHtml: (html) => html.replace("style-src 'self'", "style-src 'self' 'unsafe-inline'"),
};

export default defineConfig({
  root: '.',
  plugins: [react(), devStylePolicy],
  base: './',
  build: { outDir: 'dist-renderer', emptyOutDir: true, target: 'chrome142', sourcemap: true },
});
