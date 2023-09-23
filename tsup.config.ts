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
    banner: {
        js: `
    // BANNER START
    const require = (await import("node:module")).createRequire(import.meta.url);
    const __filename = (await import("node:url")).fileURLToPath(import.meta.url);
    const __dirname = (await import("node:path")).dirname(__filename);
    // BANNER END
    `,
    },
});
