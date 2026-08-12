import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'assets',
    emptyOutDir: false, // Prevents Vite from deleting your other Shopify assets!
    rollupOptions: {
      input: 'src/lookbook-app.jsx',
      output: {
        entryFileNames: 'react-lookbook.js', // The file Shopify will use
        assetFileNames: 'react-lookbook.[ext]'
      }
    }
  }
});