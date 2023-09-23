import { defineConfig } from 'tsup';

export default defineConfig({
    format: [
        'esm',
    ],
    clean: true,
    minify: true,
    splitting: true,
    treeshake: true,
    external: [],
    entry: {
        index: './src/index.ts'
    },
});
