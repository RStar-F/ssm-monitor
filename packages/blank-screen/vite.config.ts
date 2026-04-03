import { defineConfig, mergeConfig } from 'vite';
import viteBaseConfig from '../../vite.base.config';

export default defineConfig(() => mergeConfig(viteBaseConfig, {
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'BlankScreen',
      fileName: 'blank-screen',
      formats: ['es']
    }
  },
  server: {
    open: '/index.html',
    port: 3004
  }
}));