import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  // `pnpm verify` builds into .next-verify so it never wipes the dev server's .next out from under it.
  distDir: process.env.NEXT_DIST_DIR || '.next',
}

export default nextConfig
