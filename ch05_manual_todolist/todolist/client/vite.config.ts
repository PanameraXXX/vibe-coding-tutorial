import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 注意：此处的 proxy 配置不要修改（来自项目约定 CLAUDE.md）
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
