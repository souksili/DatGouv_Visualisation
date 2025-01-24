import { defineConfig } from 'vite';
import ghPages from 'vite-plugin-gh-pages';

export default defineConfig({
  base: '/DatGouv_Visualisation/données non-structurées/',
  plugins: [ghPages()],
  server: {
    open: true
  }
});