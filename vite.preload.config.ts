import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist-electron',
    emptyOutDir: false,
    lib: { entry: 'src/preload/preload.ts', formats: ['cjs'], fileName: () => 'preload.cjs' },
    rollupOptions: { external: ['electron'] },
    target: 'node24',
    sourcemap: true,
  },
});
