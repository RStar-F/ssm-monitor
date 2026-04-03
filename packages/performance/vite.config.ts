import { defineConfig, mergeConfig } from 'vite';
import viteBaseConfig from '../../vite.base.config';

export default defineConfig(() => mergeConfig(viteBaseConfig, {
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'Performance',
      fileName: 'performance',
      formats: ['es', 'umd', 'iife']
    },
  },
  server: {
    open: '/index.html',
    port: 3002
  }
}));