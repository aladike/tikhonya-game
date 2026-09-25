import { defineConfig } from 'vite';
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'tikhonya-game';
export default defineConfig({ base: `/${repo}/`, build: { target: 'es2022', chunkSizeWarningLimit: 650 } });
