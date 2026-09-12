'use client'

import { siteConfig } from '@/config/site-config'
import { t } from '@/lib/copy'
import { cn } from '@/lib/utils'
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, Phone } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

/**
 * Quote form.
 *
 * Posts straight into the Sapt `lead` object type, which is publicly
 * ingestable, so no API key ships to the browser and no server route is
 * needed. Every field name matches the CRM schema exactly. Rename one and it
 * lands in pendingFields instead of the record.
 *
 * Dark panel, brand-colored top edge, visible labels, four fields, one
 * button. Every label, placeholder and state message comes from
 * copy.quoteForm. The option *values* are the CRM field and stay fixed.
 *
 * Kept short deliberately. The visitor may be standing in a flooded bathroom.
 * The address is asked for by text afterwards, not here.
 */

type Status = 'idle' | 'submitting' | 'success' | 'error'

export function QuoteForm({
  className,
  defaultService = '',
  heading,
}: {
  className?: string
  /** Pre-select the page's own service so a visitor on /services/x isn't asked what they need. */
  defaultService?: string
  heading?: string
}) {
  const { companyName, dark, phoneHref, phoneNumber, photos, pages, saptBaseUrl, saptProjectId, copy } = siteConfig
  const q = copy.quoteForm
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)

    // Honeypot. Bots fill hidden fields, humans never see this one.
    if (data.get('company_website')) return

    const serviceNeeded = String(data.get('service_needed') || '')

    const payload = {
      full_name: String(data.get('full_name') || '').trim(),
      phone: String(data.get('phone') || '').trim(),
      service_needed: serviceNeeded,
      // An emergency selection sets urgency so the alert workflow routes it
      // straight to the owner's phone instead of into the drip sequence.
      urgency: serviceNeeded === 'backup_emergency' ? 'emergency_now' : 'this_week',
      message: String(data.get('message') || '').trim(),
      source: 'web_form',
      consent_sms: data.get('consent_sms') === 'on',
    }

    if (!payload.full_name || !payload.phone) {
      setStatus('error')
      setErrorMsg(q.errorMissing)
      return
    }

    setStatus('submitting')
    setErrorMsg('')

    try {
      const res = await fetch(`${saptBaseUrl}/public/projects/${saptProjectId}/objects/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The public ingest endpoint only reads fields inside `data`; a flat
        // body creates an empty record. Verified against the live API.
        body: JSON.stringify({ data: payload }),
      })
      if (!res.ok) throw new Error(String(res.status))
      setStatus('success')
      form.reset()
    } catch {
      setStatus('error')
      setErrorMsg(t(q.errorSend))
    }
  }

  const panel = cn('border border-white/10 border-t-4 border-t-primary-500 text-white', className)

  if (status === 'success') {
    return (
      <div className={panel} style={{ backgroundColor: dark.raised }}>
        <div className="p-8 text-center sm:p-10">
          {photos.logoLight && <img src={photos.logoLight} alt={companyName} className={cn('mx-auto mb-6 h-8 w-auto', photos.logoLightKnockout && 'brightness-0 invert')} />}
          <CheckCircle2 className="mx-auto h-11 w-11 text-primary-500" strokeWidth={1.75} />
          <h3 className="mt-4 text-2xl font-extrabold uppercase tracking-tight">{q.successTitle}</h3>
          <p className="mt-2 text-sm text-white/65">{q.successBody}</p>
          <a
            href={phoneHref}
            className="mt-6 inline-flex items-center gap-2 border-2 border-white/25 px-5 py-3 text-xs font-extrabold uppercase tracking-[0.14em] transition-colors hover:bg-white hover:text-neutral-900"
          >
            <Phone className="h-4 w-4" />
            {q.successCall}
          </a>
        </div>
      </div>
    )
  }

  const label = 'mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.14em] text-white/70'
  const field =
    'w-full border-2 border-transparent bg-white px-4 py-3.5 text-text placeholder:text-text-light focus:border-primary-500 focus:outline-none'
  const req = <span className="text-primary-500"> *</span>

  return (
    <form onSubmit={handleSubmit} className={panel} style={{ backgroundColor: dark.raised }}>
      <div className="grid gap-4 p-6 sm:p-8">
        <div className="text-center">
          {photos.logoLight && <img src={photos.logoLight} alt={companyName} className={cn('mx-auto mb-4 h-8 w-auto', photos.logoLightKnockout && 'brightness-0 invert')} />}
          <h3 className="text-2xl font-extrabold uppercase tracking-tight sm:text-[1.7rem]">{heading ?? q.heading}</h3>
          {q.subline && <p className="mt-1.5 text-sm text-white/60">{q.subline}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={label}>{q.nameLabel}{req}</span>
            <input name="full_name" type="text" autoComplete="name" required placeholder={q.namePlaceholder} className={field} />
          </label>
          <label className="block">
            <span className={label}>{q.phoneLabel}{req}</span>
            <input name="phone" type="tel" autoComplete="tel" required placeholder={phoneNumber} className={field} />
          </label>
        </div>

        <label className="block">
          <span className={label}>{q.serviceLabel}{req}</span>
          <select name="service_needed" required defaultValue={defaultService} className={field}>
            <option value="" disabled>{q.servicePlaceholder}</option>
            {q.serviceOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={label}>{q.messageLabel}</span>
          <textarea name="message" rows={3} placeholder={q.messagePlaceholder} className={cn(field, 'resize-none')} />
        </label>

        {/* Honeypot. Hidden from people, catnip for bots. */}
        <input
          type="text"
          name="company_website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute left-[-9999px] h-0 w-0 opacity-0"
        />

        {/* The link sits outside the <label> on purpose: a link inside a label
            toggles the checkbox AND navigates on the same click. */}
        <div className="flex items-start gap-3 text-xs leading-relaxed text-white/70">
          <input id="consent_sms" type="checkbox" name="consent_sms" defaultChecked className="mt-0.5 h-4 w-4 shrink-0 accent-primary-500" />
          <span>
            <label htmlFor="consent_sms">{q.consent}</label>{' '}
            {pages.privacy ? (
              <Link href="/privacy" className="text-primary-500 underline underline-offset-2">{q.consentLink}</Link>
            ) : (
              <span>{q.consentLink}</span>
            )}
            {q.consentSuffix}
          </span>
        </div>

        {status === 'error' && (
          <p className="flex items-start gap-2 border-l-4 border-accent-500 bg-white/5 p-3 text-sm text-accent-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {errorMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="mt-1 flex w-full items-center justify-center gap-2 bg-primary-500 py-4 text-sm font-extrabold uppercase tracking-[0.14em] text-white transition-colors hover:bg-primary-600 disabled:opacity-60"
        >
          {status === 'submitting' ? (
            <><Loader2 className="h-4 w-4 animate-spin" />{q.sending}</>
          ) : (
            <>{q.submit}<ArrowRight className="h-4 w-4" /></>
          )}
        </button>
      </div>
    </form>
  )
}
