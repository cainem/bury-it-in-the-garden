import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Base URL for GitHub Pages deployment
  base: '/bury-it-in-the-garden/',

  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        backtest: resolve(__dirname, 'backtest.html')
      }
    }
  },

  server: {
    port: 3000,
    open: true
  },

  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.js'
      ]
    }
  }
});
