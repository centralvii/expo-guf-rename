import { execSync } from 'node:child_process';
import { defineConfig, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import pkg from './package.json';

function getGitCommitHash() {
  try {
    return execSync('git rev-parse --short HEAD', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'unknown';
  }
}

const config: UserConfig = {
  plugins: [
    react(),
    ...(process.env.ANALYZE ? [visualizer({ open: true, gzipSize: true, brotliSize: true })] : []),
  ],
  define: {
    __APP_GIT_COMMIT__: JSON.stringify(getGitCommitHash()),
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
};

export default defineConfig(config);
