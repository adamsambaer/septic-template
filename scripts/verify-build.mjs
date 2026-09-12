// The build half of `pnpm verify`: a normal `npm run build` (prebuild included)
// pointed at .next-verify, so it never touches the .next a running dev server
// is serving from. Cloudflare and `pnpm build` keep using .next.
import { spawnSync } from 'node:child_process'

const r = spawnSync('npm run build', { stdio: 'inherit', shell: true, env: { ...process.env, NEXT_DIST_DIR: '.next-verify' } })
process.exit(r.status ?? 1)
