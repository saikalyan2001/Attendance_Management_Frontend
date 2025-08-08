import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    minify: 'terser', // Ensure minification with Terser
    target: 'esnext', // Target modern browsers to avoid legacy polyfills
    rollupOptions: {
      output: {
        manualChunks: {
          // Split heavy dependencies into separate chunks
          vendor: ['react', 'react-dom', 'react-redux', '@reduxjs/toolkit'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-alert-dialog', 'lucide-react'],
          utils: ['lodash.debounce', 'react-hot-toast', 'clsx', 'tailwind-merge'],
        },
      },
    },
  },
});