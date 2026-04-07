import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'node:path'
import { mxcadAssetsPlugin } from 'mxcad-app/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    mxcadAssetsPlugin({
      /* README mentions transformMxcadUiConfig; this package exposes transformMxUiConfig (mxUiConfig.json). */
      transformMxUiConfig: (config) => {
        config.title = 'MxCAD'
        config.headerTitle = 'MxCAD'
        return config
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
