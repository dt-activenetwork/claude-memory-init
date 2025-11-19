import { defineConfig } from 'vite';
import { resolve } from 'path';
import { builtinModules } from 'module';

export default defineConfig({
  build: {
    // Library mode for CLI tool
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    outDir: 'dist',
    // Generate source maps
    sourcemap: true,
    // Minify for production
    minify: false, // Keep readable for debugging
    // Target Node.js 18+
    target: 'node18',
    // Use CommonJS for Node.js compatibility
    ssr: true,
    // Rollup options
    rollupOptions: {
      // Externalize dependencies (don't bundle them)
      external: [
        // All Node.js built-in modules
        ...builtinModules,
        ...builtinModules.map(m => `node:${m}`),
        // NPM dependencies
        'chalk',
        'commander',
        'fs-extra',
        'inquirer',
        'ora',
        'simple-git',
        'yaml',
        /^node:/, // Any node: prefixed imports
      ],
      output: {
        // Preserve module structure
        preserveModules: true,
        preserveModulesRoot: 'src',
        // Use directory import style
        entryFileNames: '[name].js',
      },
    },
    // Don't clear dist before build (we might want to keep some files)
    emptyOutDir: true,
  },
  resolve: {
    extensions: ['.ts', '.js', '.json'],
  },
});
