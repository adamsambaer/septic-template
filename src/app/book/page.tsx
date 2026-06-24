'use client'

import { track, identify, readUtmParams, getVisitorId } from '@/lib/analytics'
import { haptic } from '@/lib/haptics'
import { cn } from '@/lib/utils'
import confetti from 'canvas-confetti'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  Phone,
  User,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

/* ════════════════════════════════════════════════════════════════════════════
   CONFIGURATION
   ────────────────────────────────────────────────────────────────────────────
   Update these values to match your client's booking flow.
   ════════════════════════════════════════════════════════════════════════════ */

// ⬇️ CHANGE THIS: Services available for booking
const SERVICES = [
  {
    id: 'consultation',
    name: 'Free Consultation',
    description: 'Initial discovery call to discuss your needs and goals.',
    duration: '30 min',
    icon: User,
    gradient: 'from-primary-500 to-primary-600',
  },
  {
    id: 'service-a',
    name: 'Standard Service',
    description: 'Our most popular service package with comprehensive support.',
    duration: '1 hour',
    icon: Clock,
    gradient: 'from-accent-500 to-accent-600',
  },
]

// ⬇️ CHANGE THIS: Available time slots
const TIME_SLOTS = [
  '9:00 AM',
  '10:00 AM',
  '11:00 AM',
  '1:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM',
  '5:00 PM',
]

// ⬇️ CHANGE THIS: Business location
const LOCATION = {
  address: '123 Main Street, Suite 100',
  city: 'Your City, ST 12345',
}

// ⬇️ CHANGE THIS: Contact phone
const PHONE = '(555) 123-4567'
const PHONE_HREF = 'tel:+15551234567'

type Step = 1 | 2 | 3 | 4 | 5 | 6

interface BookingData {
  service: string
  serviceName: string
  date: Date | null
  time: string
  name: string
  email: string
  phone: string
}

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay()

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export default function BookPage() {
  const [step, setStep] = useState<Step>(1)
  const [booking, setBooking] = useState<BookingData>({
    service: '',
    serviceName: '',
    date: null,
    time: '',
    name: '',
    email: '',
    phone: '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())

  // Time picker
  const timePickerRef = useRef<HTMLDivElement>(null)
  const [selectedTimeIndex, setSelectedTimeIndex] = useState(0)
  const ITEM_HEIGHT = 56
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleTimeScroll = useCallback(() => {
    if (!timePickerRef.current) return

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    scrollTimeoutRef.current = setTimeout(() => {
      if (!timePickerRef.current) return
      const scrollTop = timePickerRef.current.scrollTop
      const index = Math.round(scrollTop / ITEM_HEIGHT)
      setSelectedTimeIndex(Math.max(0, Math.min(index, TIME_SLOTS.length - 1)))
    }, 50)
  }, [])

  const confirmTimeSelection = () => {
    const time = TIME_SLOTS[selectedTimeIndex]
    updateBooking({ time })
    track('booking_time_selected', { time })
    haptic('selection')
    nextStep()
  }

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [step])

  // Confetti + haptic on confirmation
  useEffect(() => {
    if (step === 6) {
      const colors = ['#3B82F6', '#60A5FA', '#93C5FD', '#FBBF24', '#FCD34D']

      const fireConfetti = () => {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: colors,
        })
      }

      haptic('success')
      fireConfetti()
      setTimeout(fireConfetti, 200)
      setTimeout(fireConfetti, 400)
    }
  }, [step])

  const nextStep = () => setStep((s) => Math.min(s + 1, 6) as Step)
  const prevStep = () => setStep((s) => Math.max(s - 1, 1) as Step)
  const updateBooking = (data: Partial<BookingData>) => setBooking((prev) => ({ ...prev, ...data }))

  // Track that the funnel was opened (once).
  useEffect(() => {
    track('funnel_view', { funnel: 'booking' })
  }, [])

  // Submit the completed booking to the CRM via /api/book, then advance to the
  // confirmation step. Analytics + identity fire alongside the CRM write.
  const submitBooking = async () => {
    if (isSubmitting) return
    haptic('light')
    setSubmitError(null)
    setIsSubmitting(true)

    identify({ email: booking.email, name: booking.name, phone: booking.phone })
    track('booking_submit', { service: booking.serviceName })

    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: booking.name,
          email: booking.email,
          phone: booking.phone,
          service: booking.service,
          serviceName: booking.serviceName,
          date: booking.date ? booking.date.toISOString().slice(0, 10) : undefined,
          time: booking.time,
          visitorId: getVisitorId(),
          utm: readUtmParams(),
        }),
      })
      const data = (await res.json()) as { ok: boolean; error?: string }
      if (!res.ok || !data.ok) throw new Error(data.error || 'Something went wrong')

      track('booking_confirmed', { service: booking.serviceName })
      nextStep()
    } catch (err) {
      console.error('Booking submission failed:', err)
      setSubmitError(
        err instanceof Error ? err.message : 'We could not save your booking. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (date: Date | null) => {
    if (!date) return ''
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const formatLongDate = (date: Date | null) => {
    if (!date) return ''
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1) }
    else setCurrentMonth(currentMonth - 1)
  }

  const nextMonthFn = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1) }
    else setCurrentMonth(currentMonth + 1)
  }

  const isDateSelectable = (day: number) => {
    const date = new Date(currentYear, currentMonth, day)
    const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const isWeekend = date.getDay() === 0 || date.getDay() === 6
    return !isPast && !isWeekend
  }

  const isSelectedDate = (day: number) => {
    if (!booking.date) return false
    return booking.date.getDate() === day && booking.date.getMonth() === currentMonth && booking.date.getFullYear() === currentYear
  }

  const isToday = (day: number) => today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear

  const canGoPrevMonth = () => currentYear > today.getFullYear() || (currentYear === today.getFullYear() && currentMonth > today.getMonth())

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth)
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
    const days = []
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} />)
    for (let day = 1; day <= daysInMonth; day++) {
      const selectable = isDateSelectable(day)
      const selected = isSelectedDate(day)
      days.push(
        <button
          key={day}
          disabled={!selectable}
          onClick={() => { updateBooking({ date: new Date(currentYear, currentMonth, day) }); track('booking_date_selected', {}); haptic('selection'); nextStep() }}
          className={cn(
            'aspect-square rounded-full text-sm font-medium transition-all flex items-center justify-center',
            selected ? 'bg-primary-500 text-white shadow-md' : selectable ? 'hover:bg-primary-100 text-text' : 'text-text-light cursor-not-allowed',
            isToday(day) && !selected ? 'ring-2 ring-primary-200' : ''
          )}
        >
          {day}
        </button>
      )
    }
    return days
  }

  return (
    <div className="min-h-[100dvh] bg-bg relative">
      {/* Background accents - hidden on mobile for performance */}
      <div className="hidden md:block fixed inset-0 pointer-events-none">
        <div className="absolute -top-20 -right-20 w-[500px] h-[600px] bg-primary-200/20 blur-[80px] rounded-full" />
        <div className="absolute top-[30%] -left-32 w-[400px] h-[500px] bg-accent-200/15 blur-[60px] rounded-full" />
        <div className="absolute bottom-[10%] left-[30%] w-[450px] h-[400px] bg-primary-100/15 blur-[70px] rounded-full" />
      </div>

      {/* Progress bar */}
      {step < 6 && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-border z-50">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-500 ease-out"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
      )}

      {/* Main content - centered */}
      <main className="relative min-h-[100dvh] flex items-center justify-center px-4 sm:px-6 py-8 lg:py-12 [padding-bottom:max(2rem,env(safe-area-inset-bottom))]">
        {/* Step 1 - Service Selection */}
        {step === 1 && (
          <div className="animate-fadeIn w-full max-w-xl">
            <div className="mb-6 text-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-text mb-1">Book Your Appointment</h1>
              <p className="text-text-muted">Select a service to get started</p>
            </div>
            <div className="space-y-4">
              {SERVICES.map((service) => (
                <button
                  key={service.id}
                  onClick={() => { updateBooking({ service: service.id, serviceName: service.name }); track('booking_service_selected', { service: service.name }); haptic('selection'); nextStep() }}
                  className="w-full bg-surface rounded-2xl p-6 border border-border hover:border-primary-400 hover:shadow-xl transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className={cn('w-12 h-12 bg-gradient-to-br rounded-xl flex items-center justify-center flex-shrink-0 shadow-md', service.gradient)}>
                      <service.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-text">{service.name}</h3>
                        <ArrowRight className="h-5 w-5 text-text-light group-hover:text-primary-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                      </div>
                      <p className="text-text-muted text-sm leading-relaxed">{service.description}</p>
                      <div className="flex items-center gap-3 mt-3 text-sm">
                        <span className="flex items-center gap-1 text-text-light"><Clock className="h-3.5 w-3.5" />{service.duration}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Link href="/" className="text-sm text-text-muted hover:text-primary-500 transition-colors">
                ← Back to Home
              </Link>
            </div>
          </div>
        )}

        {/* Step 2 - Calendar */}
        {step === 2 && (
          <div className="animate-fadeIn w-full max-w-xl">
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevStep} className="flex items-center gap-1 text-sm text-text-muted hover:text-primary-500 transition-colors">
                <ArrowLeft className="h-4 w-4" />Back
              </button>
              <div className="text-center flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-text">Select Date</h1>
              </div>
              <div className="w-12" />
            </div>

            <div className="bg-surface rounded-2xl p-4 sm:p-5 border border-border shadow-lg">
              {/* Month nav */}
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-text">{monthNames[currentMonth]} {currentYear}</h2>
                <div className="flex gap-1">
                  <button onClick={prevMonth} disabled={!canGoPrevMonth()} className="w-8 h-8 rounded-full border border-border bg-surface flex items-center justify-center hover:bg-primary-50 disabled:opacity-30 shadow-sm transition-all">
                    <ChevronLeft className="h-4 w-4 text-text-muted" />
                  </button>
                  <button onClick={nextMonthFn} className="w-8 h-8 rounded-full border border-border bg-surface flex items-center justify-center hover:bg-primary-50 shadow-sm transition-all">
                    <ChevronRight className="h-4 w-4 text-text-muted" />
                  </button>
                </div>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {dayNames.map((d) => <div key={d} className="text-center text-xs font-medium text-text-light py-1">{d}</div>)}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {renderCalendar()}
              </div>
            </div>
          </div>
        )}

        {/* Step 3 - Time */}
        {step === 3 && (
          <div className="animate-fadeIn w-full max-w-xl">
            <div className="flex items-center justify-between mb-6">
              <button onClick={prevStep} className="flex items-center gap-1 text-sm text-text-muted hover:text-primary-500 transition-colors">
                <ArrowLeft className="h-4 w-4" />Back
              </button>
              <div className="text-center flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-text">Select Time</h1>
                <p className="text-sm text-text-muted">{formatDate(booking.date)}</p>
              </div>
              <div className="w-12" />
            </div>

            {/* Scroll wheel time picker */}
            <div className="relative">
              {/* Selection indicator */}
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-14 border-y border-border pointer-events-none z-10" />

              {/* Scroll container with fade mask */}
              <div
                ref={timePickerRef}
                onScroll={handleTimeScroll}
                className="h-[280px] overflow-y-auto scrollbar-hide snap-y snap-mandatory"
                style={{
                  maskImage: 'linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%)',
                }}
              >
                {/* Top padding to center first item */}
                <div style={{ height: `${(280 - ITEM_HEIGHT) / 2}px` }} />

                {TIME_SLOTS.map((time, index) => (
                  <div
                    key={time}
                    className={cn(
                      'h-14 flex items-center justify-center snap-center transition-all duration-200 cursor-pointer',
                      index === selectedTimeIndex
                        ? 'text-2xl font-semibold text-text'
                        : 'text-lg text-text-light'
                    )}
                    onClick={() => {
                      setSelectedTimeIndex(index)
                      timePickerRef.current?.scrollTo({
                        top: index * ITEM_HEIGHT,
                        behavior: 'smooth'
                      })
                    }}
                  >
                    {time}
                  </div>
                ))}

                {/* Bottom padding to center last item */}
                <div style={{ height: `${(280 - ITEM_HEIGHT) / 2}px` }} />
              </div>
            </div>

            <button
              onClick={confirmTimeSelection}
              className="mt-6 w-full bg-surface hover:border-primary-400 text-text font-semibold py-3.5 text-base rounded-full border border-border shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group"
            >
              Continue
              <ArrowRight className="h-5 w-5 text-text-light group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
            </button>
          </div>
        )}

        {/* Step 4 - Contact Info */}
        {step === 4 && (
          <div className="animate-fadeIn w-full max-w-xl">
            <div className="flex items-center justify-between mb-8">
              <button onClick={prevStep} className="flex items-center gap-1 text-sm text-text-muted hover:text-primary-500 transition-colors">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="text-center flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-text">Your Details</h1>
              </div>
              <div className="w-6" />
            </div>

            <div className="space-y-5">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-text mb-2">
                  <User className="h-4 w-4" />
                  Full Name
                </label>
                <input
                  type="text"
                  autoComplete="name"
                  enterKeyHint="next"
                  value={booking.name}
                  onChange={(e) => updateBooking({ name: e.target.value })}
                  className="w-full px-4 py-4 rounded-2xl border border-border bg-bg focus:bg-surface focus:ring-2 focus:ring-primary-500/50 focus:border-transparent outline-none transition-all text-text"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-text mb-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Email
                </label>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  enterKeyHint="next"
                  value={booking.email}
                  onChange={(e) => updateBooking({ email: e.target.value })}
                  className="w-full px-4 py-4 rounded-2xl border border-border bg-bg focus:bg-surface focus:ring-2 focus:ring-primary-500/50 focus:border-transparent outline-none transition-all text-text"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-text mb-2">
                  <Phone className="h-4 w-4" />
                  Phone
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  enterKeyHint="done"
                  value={booking.phone}
                  onChange={(e) => updateBooking({ phone: e.target.value })}
                  className="w-full px-4 py-4 rounded-2xl border border-border bg-bg focus:bg-surface focus:ring-2 focus:ring-primary-500/50 focus:border-transparent outline-none transition-all text-text"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <button
              onClick={() => { track('booking_details_completed', {}); nextStep() }}
              disabled={!booking.name || !booking.email || !booking.phone}
              className="mt-8 w-full bg-surface hover:border-primary-400 text-text font-semibold py-3.5 text-base rounded-full border border-border shadow-lg hover:shadow-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 group"
            >
              Review Booking
              <ArrowRight className="h-5 w-5 text-text-light group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
            </button>
          </div>
        )}

        {/* Step 5 - Review */}
        {step === 5 && (
          <div className="animate-fadeIn w-full max-w-xl">
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevStep} className="flex items-center gap-1 text-sm text-text-muted hover:text-primary-500 transition-colors">
                <ArrowLeft className="h-4 w-4" />Back
              </button>
              <div className="text-center flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-text">Review</h1>
              </div>
              <div className="w-12" />
            </div>

            <div className="bg-surface rounded-2xl border border-border shadow-lg overflow-hidden">
              <div className="p-4 border-b border-border">
                <p className="text-xs text-text-light">Service</p>
                <p className="font-medium text-text text-sm">{booking.serviceName}</p>
              </div>
              <div className="p-4 border-b border-border">
                <p className="text-xs text-text-light">Date & Time</p>
                <p className="font-medium text-text text-sm">{formatLongDate(booking.date)} at {booking.time}</p>
              </div>
              <div className="p-4 border-b border-border flex items-start gap-2">
                <MapPin className="h-4 w-4 text-primary-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-text text-sm">{LOCATION.address}</p>
                  <p className="text-text-muted text-xs">{LOCATION.city}</p>
                </div>
              </div>
              <div className="p-4">
                <p className="text-xs text-text-light">Contact</p>
                <p className="font-medium text-text text-sm">{booking.name}</p>
                <p className="text-text-muted text-xs">{booking.email} · {booking.phone}</p>
              </div>
            </div>

            <button
              onClick={submitBooking}
              disabled={isSubmitting}
              className="mt-4 w-full btn-primary py-3.5 text-base rounded-full shadow-lg disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  Confirm Booking
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>

            {submitError && (
              <div className="mt-4 flex items-start gap-2 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{submitError}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 6 - Confirmation */}
        {step === 6 && (
          <div className="animate-fadeIn text-center w-full max-w-xl">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center mb-5 shadow-lg mx-auto">
              <Check className="h-8 w-8 text-white" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-text mb-1">You&apos;re All Set!</h1>
            <p className="text-text-muted mb-6">Confirmation sent to {booking.email}</p>

            <div className="bg-surface rounded-2xl border border-border shadow-lg p-5 text-left mb-4">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                <div>
                  <p className="text-xs text-text-light">Your Appointment</p>
                  <p className="font-semibold text-text">{formatDate(booking.date)} at {booking.time}</p>
                </div>
                <Clock className="h-5 w-5 text-primary-500" />
              </div>
              <p className="text-sm font-medium text-text mb-2">What&apos;s next?</p>
              <ul className="text-sm text-text-muted space-y-1">
                <li>• Confirmation email sent</li>
                <li>• Our team will call to confirm</li>
                <li>• Arrive 10 min early</li>
              </ul>
            </div>

            <Link
              href="/"
              className="w-full bg-surface hover:border-primary-400 text-text font-semibold py-3.5 text-base rounded-full border border-border shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
            >
              Back to Home
            </Link>

            <div className="mt-6 text-center">
              <p className="text-text-light text-sm mb-1">Questions?</p>
              <a href={PHONE_HREF} className="inline-flex items-center gap-1.5 text-primary-500 font-medium">
                <Phone className="h-4 w-4" />{PHONE}
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
