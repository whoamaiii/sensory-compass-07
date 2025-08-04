import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  worker: {
    format: 'es',
    rollupOptions: {
      output: {
        entryFileNames: '[name].[hash].worker.js'
      }
    }
  },
  optimizeDeps: {
    exclude: [],
    include: ['echarts', 'date-fns']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          'vendor-charts': ['echarts'],
          'vendor-utils': ['date-fns', 'clsx', 'tailwind-merge'],
          'interactive-viz': ['./src/components/InteractiveDataVisualization.tsx'],
          'viz-3d': ['./src/components/Visualization3D.tsx'],
          'timeline-viz': ['./src/components/TimelineVisualization.tsx']
        }
      }
    },
    chunkSizeWarningLimit: 2500
  }
}));
