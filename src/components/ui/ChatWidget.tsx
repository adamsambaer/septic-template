'use client'

import { siteConfig } from '@/config/site-config'
import { t } from '@/lib/copy'
import { cn } from '@/lib/utils'
import { AlertCircle, ArrowRight, Check, ChevronDown, Loader2, MessageSquareText, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

/**
 * Text-us chat widget.
 *
 * Looks like a chat. Behaves like a text message: name, mobile, one message,
 * consent, Send. The submission is a `lead` record with source `chat_widget`,
 * the same pipeline as the quote form, so the Sapt workflows text the owner
 * and text the visitor back on the Telnyx number. No inbox, no email.
 *
 * Closed by default. The launcher sits above the phone call bar on small
 * screens and in the corner on desktop. A message that reads like an
 * emergency (backup, overflow, flooding) is flagged as one so the emergency
 * alert fires instead of the drip sequence.
 *
 * Everything the visitor reads comes from copy.chatWidget; the toggle is
 * siteConfig.chat.enabled (Sapt: 1 · Site settings → Chat widget).
 */

const EMERGENCY = /backing up|backed up|back-?up|overflow|flood|sewage|coming up|won'?t flush|alarm/i
const STORAGE = 'septic-chat'

function digits(v: string) {
  const d = v.replace(/\D/g, '')
  return d.length === 11 && d.startsWith('1') ? d.slice(1) : d
}
function pretty(d: string) {
  if (d.length <= 3) return d
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`
}

type Status = 'idle' | 'sending' | 'sent' | 'error'

export function ChatWidget() {
  const { chat, copy, photos, companyName, saptBaseUrl, saptProjectId, dark } = siteConfig
  const c = copy.chatWidget
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [consent, setConsent] = useState(true)
  const [sent, setSent] = useState<{ name: string; phone: string; message: string } | null>(null)

  // Remember a sent conversation for the session so reopening shows the reply, not a blank form.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE)
      if (raw) {
        const saved = JSON.parse(raw) as { name: string; phone: string; message: string }
        setSent(saved)
        setStatus('sent')
      }
    } catch {
      /* storage unavailable: start fresh */
    }
  }, [])

  const close = useCallback(() => setOpen(false), [])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  if (!chat.enabled) return null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const d = digits(phone)
    if (!name.trim() || d.length !== 10) {
      setStatus('error')
      setError(c.errorMissing)
      return
    }
    const text = message.trim()
    const emergency = EMERGENCY.test(text)
    setStatus('sending')
    setError('')
    try {
      const res = await fetch(`${saptBaseUrl}/public/projects/${saptProjectId}/objects/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            full_name: name.trim(),
            phone: pretty(d),
            message: text,
            source: 'chat_widget',
            service_needed: emergency ? 'backup_emergency' : 'unsure',
            urgency: emergency ? 'emergency_now' : 'this_week',
            consent_sms: consent,
          },
        }),
      })
      if (!res.ok) throw new Error(String(res.status))
      const record = { name: name.trim(), phone: pretty(d), message: text }
      setSent(record)
      setStatus('sent')
      try { sessionStorage.setItem(STORAGE, JSON.stringify(record)) } catch { /* ignore */ }
    } catch {
      setStatus('error')
      setError(t(c.errorSend))
    }
  }

  const field = 'w-full border-2 border-border bg-white px-3.5 py-3 text-sm text-text placeholder:text-text-light focus:border-primary-500 focus:outline-none'
  const label = 'mb-1 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-muted'

  // Initials, not the logo: a wide lockup squeezed into a 36px square is unreadable.
  const initials = companyName.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
  const Avatar = (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-text text-xs font-extrabold tracking-wide text-white" aria-hidden="true">
      {initials}
    </span>
  )
  // Inline flag: emoji flags do not render on Windows.
  const Flag = (
    <svg viewBox="0 0 20 14" className="h-3.5 w-5 shrink-0" aria-hidden="true">
      <rect width="20" height="14" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12].map((y) => <rect key={y} y={y} width="20" height="1.08" fill="#B22234" />)}
      <rect width="8" height="7.5" fill="#3C3B6E" />
    </svg>
  )

  return (
    <>
      {/* Panel */}
      <div
        hidden={!open}
        role="dialog"
        aria-label={c.title}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+9.25rem)] right-4 z-50 flex w-[calc(100vw-2rem)] max-w-[380px] flex-col border border-black/10 bg-surface shadow-2xl shadow-black/25 lg:bottom-24 lg:right-6"
      >
        <header className="flex items-center gap-3 border-t-4 border-primary-500 p-4 text-white" style={{ backgroundColor: dark.base }}>
          {photos.logoLight ? (
            <img src={photos.logoLight} alt={companyName} className={cn('h-8 w-auto', photos.logoLightKnockout && 'brightness-0 invert')} />
          ) : (
            <span className="text-sm font-extrabold uppercase">{companyName}</span>
          )}
          <p className="flex-1 text-sm font-extrabold leading-tight">{c.title}</p>
          <button type="button" onClick={close} aria-label="Close" className="flex h-8 w-8 items-center justify-center text-white/70 hover:text-white">
            <ChevronDown className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </header>

        <div className="max-h-[min(70vh,560px)] overflow-y-auto bg-bg p-4">
          {/* Owner greeting */}
          <div className="flex items-start gap-3">
            {Avatar}
            <p className="border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-text">{c.greeting}</p>
          </div>

          {status === 'sent' && sent ? (
            <>
              <div className="mt-3 flex justify-end">
                <p className="max-w-[85%] bg-text px-4 py-3 text-sm leading-relaxed text-white">{sent.message || sent.phone}</p>
              </div>
              <div className="mt-3 flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-primary-500 text-white" aria-hidden="true">
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
                <div className="border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-text">
                  <strong className="block font-extrabold">{c.thanksTitle}</strong>
                  {t(c.thanksBody, { name: sent.name.split(' ')[0], mobile: sent.phone })}
                </div>
              </div>
            </>
          ) : (
            <form onSubmit={submit} className="mt-3 grid gap-3 border border-border bg-surface p-4">
              <label className="block">
                <span className={label}>{c.nameLabel}</span>
                <input type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={c.namePlaceholder} className={field} />
              </label>
              <label className="block">
                <span className={label}>{c.phoneLabel}</span>
                <span className="flex">
                  <span className="flex items-center gap-1.5 border-2 border-r-0 border-border bg-bg px-3 text-sm text-text" aria-hidden="true">
                    {Flag}
                    <span className="text-text-muted">+1</span>
                  </span>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    value={phone}
                    onChange={(e) => setPhone(pretty(digits(e.target.value)))}
                    placeholder={c.phonePlaceholder}
                    className={field}
                  />
                </span>
              </label>
              <label className="block">
                <span className={label}>{c.messageLabel}</span>
                <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={c.messagePlaceholder} className={cn(field, 'resize-none')} />
              </label>
              <label className="flex items-start gap-2.5 text-[11px] leading-relaxed text-text-muted">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-primary-500" />
                <span>{c.consent}</span>
              </label>
              {status === 'error' && (
                <p className="flex items-start gap-2 border-l-4 border-accent-500 bg-accent-50 p-2.5 text-xs text-accent-600">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={status === 'sending' || !consent}
                className="flex items-center justify-center gap-2 bg-primary-500 py-3.5 text-xs font-extrabold uppercase tracking-[0.14em] text-white transition-colors hover:bg-primary-600 disabled:opacity-60"
              >
                {status === 'sending' ? <><Loader2 className="h-4 w-4 animate-spin" />{c.sending}</> : <>{c.send}<ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Close' : c.openLabel}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] right-4 z-50 flex h-14 w-14 items-center justify-center bg-primary-500 text-white shadow-xl shadow-black/30 transition-colors hover:bg-primary-600 lg:bottom-6 lg:right-6"
      >
        {open ? <X className="h-6 w-6" strokeWidth={2.5} /> : <MessageSquareText className="h-6 w-6" strokeWidth={2.25} />}
      </button>
    </>
  )
}
