import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['.next/**', '.next-verify/**', '.open-next/**'],
  },
  {
    // Deliberate: this site deploys to Cloudflare Workers via OpenNext, where
    // next/image's optimizer is not available without extra infrastructure.
    // Every image is pre-compressed to webp at its display size, so plain
    // <img> is the correct choice for this target, not an oversight.
    rules: { '@next/next/no-img-element': 'off' },
  },
]

export default eslintConfig
