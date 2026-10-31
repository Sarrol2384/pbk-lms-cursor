'use client'

import { useState } from 'react'
import { INSTITUTE_EMAIL, INSTITUTE_NAME } from '@/lib/institute'

const inputClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
const labelClass = 'block text-sm font-medium text-gray-800 mb-1'

type Errors = Record<string, string>

export function ContactForm() {
  const [errors, setErrors] = useState<Errors>({})
  const [message, setMessage] = useState<string | null>(null)
  const [reference, setReference] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setErrors({})
    setMessage(null)
    const form = new FormData(event.currentTarget)
    const payload = {
      name: form.get('name'),
      email: form.get('email'),
      phone: form.get('phone'),
      subject: form.get('subject'),
      message: form.get('message'),
      popiaConsent: form.get('popiaConsent'),
      pbk_hp_field: form.get('pbk_hp_field'),
    }
    try {
      const response = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => ({})) as {
        ok?: boolean
        errors?: Errors
        message?: string
        reference?: string
        warning?: string | null
      }
      if (!response.ok || !data.ok) {
        setErrors(data.errors ?? {})
        setMessage(data.message || 'Please check the form and try again.')
        return
      }
      setReference(data.reference || 'received')
      setMessage(data.warning || null)
    } catch {
      setMessage(`We could not send the form. Please email ${INSTITUTE_EMAIL}.`)
    } finally {
      setLoading(false)
    }
  }

  if (reference) {
    return (
      <div className="bg-white border border-green-200 rounded-xl p-8 text-center shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Message received</h2>
        <p className="text-gray-600 text-sm leading-relaxed">
          Thank you for writing to us.
          {reference !== 'received' && <> Your reference is <strong className="text-gray-900">{reference}</strong>.</>}
          {' '}We will reply by email.
        </p>
        {message && <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mt-4">{message}</p>}
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="relative bg-white border border-gray-200 rounded-xl shadow-sm p-6 sm:p-8 space-y-4" noValidate>
      {message && <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{message}</div>}
      <div>
        <label htmlFor="name" className={labelClass}>Name *</label>
        <input id="name" name="name" autoComplete="name" required className={inputClass} />
        {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="email" className={labelClass}>Email address *</label>
          <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} />
          {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
        </div>
        <div>
          <label htmlFor="phone" className={labelClass}>Phone number *</label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" required className={inputClass} />
          {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
        </div>
      </div>
      <div>
        <label htmlFor="subject" className={labelClass}>Subject *</label>
        <input id="subject" name="subject" required className={inputClass} />
        {errors.subject && <p className="text-xs text-red-600 mt-1">{errors.subject}</p>}
      </div>
      <div>
        <label htmlFor="message" className={labelClass}>Message *</label>
        <textarea id="message" name="message" required rows={6} className={inputClass} />
        {errors.message && <p className="text-xs text-red-600 mt-1">{errors.message}</p>}
      </div>
      <label className="flex items-start gap-3 text-sm text-gray-700 leading-relaxed">
        <input type="checkbox" name="popiaConsent" value="true" required className="mt-1" />
        <span>
          I consent to {INSTITUTE_NAME} collecting and processing these details so that the institute can respond to my enquiry, in line with the Protection of Personal Information Act (POPIA). I may ask for access to or correction of my information by emailing {INSTITUTE_EMAIL}. *
        </span>
      </label>
      {errors.popiaConsent && <p className="text-xs text-red-600 mt-1">{errors.popiaConsent}</p>}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 overflow-hidden">
        <label>
          Company website
          <input name="pbk_hp_field" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-700 hover:bg-blue-800 disabled:bg-gray-300 text-white font-semibold px-8 py-3 rounded-xl text-sm"
      >
        {loading ? 'Sending…' : 'Send message'}
      </button>
    </form>
  )
}
