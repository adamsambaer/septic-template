// Guarantees src/config/site-config.generated.json exists so the TypeScript
// import in site-config.ts resolves on a fresh clone. An empty object means
// "demo defaults only"; `pnpm pull` replaces it with the client's snapshot.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'config', 'site-config.generated.json')
if (!fs.existsSync(file)) {
  fs.writeFileSync(file, '{}\n')
  console.log('created empty src/config/site-config.generated.json (demo defaults). Run `pnpm pull` for a client site.')
}
