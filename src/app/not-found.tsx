import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Badge */}
        <p className="text-primary-500 font-medium text-sm tracking-wide uppercase mb-4">
          Demo Site
        </p>

        {/* Heading */}
        <h1 className="text-5xl sm:text-6xl font-bold text-text mb-4">
          Coming Soon
        </h1>

        {/* Description */}
        <p className="text-text-muted text-lg mb-8">
          This page will be available in the full production site. For now, explore what&apos;s ready on the homepage.
        </p>

        {/* CTA */}
        <Link
          href="/"
          className="btn-primary inline-flex items-center gap-2 py-3.5 px-6 rounded-full"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>
    </div>
  )
}
