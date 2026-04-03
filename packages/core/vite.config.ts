import { defineConfig, mergeConfig } from 'vite';
import viteBaseConfig from '../../vite.base.config';

export default defineConfig(() => mergeConfig(viteBaseConfig, {
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'MonitorSDK',
      fileName: 'ssm',
      formats: ['es']
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {}
      }
    }
  },
  server: {
    open: '/index.html',
    port: 3000
  }
}));