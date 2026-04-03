import { defineConfig, mergeConfig } from 'vite';
import viteBaseConfig from '../../vite.base.config';

export default defineConfig(() => mergeConfig(viteBaseConfig, {
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'Tracker',
      fileName: 'tracker',
      formats: ['es']
    }
  },
  server: {
    open: '/index.html',
    port: 3001
  }
}));