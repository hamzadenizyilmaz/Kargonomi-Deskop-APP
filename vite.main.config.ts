import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    ssr: 'src/main/main.ts',
    outDir: 'dist-electron',
    emptyOutDir: true,
    rollupOptions: {
      external: ['electron'],
      output: { entryFileNames: 'main.mjs', format: 'es' },
    },
    target: 'node24',
    sourcemap: true,
  },
});
