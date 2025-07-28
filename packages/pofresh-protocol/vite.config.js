import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'lib/index.js'),
      name: 'PofreshProtocol',
      fileName: (format) => `pofresh-protocol.${format}.js`,
      formats: ['cjs', 'es', 'umd']
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {},
        exports: 'auto'
      }
    },
    outDir: 'dist',
    minify: false,
    sourcemap: true
  }
});