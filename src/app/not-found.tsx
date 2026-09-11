import { siteConfig } from '@/config/site-config'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

/** 404. Also what a page switched off in Sapt renders. Copy from copy.notFound. */
export default function NotFound() {
  const { notFound } = siteConfig.copy

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="max-w-md border-t-4 border-primary-500 bg-surface p-10 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted">{notFound.eyebrow}</p>
        <h1 className="mt-4 text-4xl font-extrabold uppercase leading-[0.98] tracking-tight text-text sm:text-5xl">
          {notFound.title}
        </h1>
        <p className="mt-5 leading-relaxed text-text-muted">{notFound.body}</p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 bg-primary-500 px-6 py-4 text-xs font-extrabold uppercase tracking-[0.14em] text-white transition-colors hover:bg-primary-600"
        >
          <ArrowLeft className="h-4 w-4" />
          {notFound.cta}
        </Link>
      </div>
    </div>
  )
}
