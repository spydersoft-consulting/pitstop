import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: './pitstop.json',
  output: {
    path: './src/api/generated',
    postProcess: ['prettier'],
  },
  plugins: ['@hey-api/client-axios'],
});
