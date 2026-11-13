import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({mode})=>{
  const env=loadEnv(mode,process.cwd(),'');
  return {
  plugins: [tailwindcss()],
  server:{proxy:{'/api':{target:env.QINAN_API_PROXY_TARGET||'http://127.0.0.1:8010',changeOrigin:true}}},
  build: {
    rollupOptions: {
      // These directives target React Server Components; this app runs in the browser.
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes('use client')) return;
        warn(warning);
      },
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/three/')) return 'three';
        }
      }
    }
  }
  };
});
