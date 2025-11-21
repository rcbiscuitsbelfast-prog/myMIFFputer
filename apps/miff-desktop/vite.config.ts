import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_MIFF_DESKTOP_BASE || env.MIFF_DESKTOP_BASE || '/';
  const apiOrigin = env.VITE_MIFF_API_ORIGIN || env.MIFF_API_ORIGIN || '';

  return {
    base,
    plugins: [react()],
    server: {
      host: env.VITE_MIFF_DEV_HOST || '0.0.0.0',
      port: Number(env.VITE_MIFF_DEV_PORT || 4173),
      proxy: apiOrigin
        ? {
            '/api': {
              target: apiOrigin,
              changeOrigin: true,
            },
          }
        : undefined,
    },
    preview: {
      host: env.VITE_MIFF_PREVIEW_HOST || '0.0.0.0',
      port: Number(env.VITE_MIFF_PREVIEW_PORT || 4173),
    },
    build: {
      outDir: 'dist',
      assetsDir: 'static',
      sourcemap: true,
      emptyOutDir: true,
      manifest: true,
      target: 'esnext',
    },
  };
});
