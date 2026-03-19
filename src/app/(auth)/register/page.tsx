'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type Step = 1 | 2

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', password: '', confirm_password: '',
    phone: '', id_number: '', address: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function isValidPhone(value: string): boolean {
    const v = value.trim()
    if (!v) return false
    if (v.includes('@')) return false
    const digits = v.replace(/\D/g, '')
    return digits.length >= 9
  }

  async function submitRegistration() {
    if (form.password !== form.confirm_password) { setError('Passwords do not match'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (!isValidPhone(form.phone)) {
      setError('Please enter a valid phone number (e.g. 0821234567). Do not use an email address.')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          id_number: form.id_number,
        }),
      })
      const text = await res.text()
      let json: { error?: string } = {}
      try {
        json = text ? JSON.parse(text) : {}
      } catch {
        setError(res.ok ? 'Signup failed. Please try again.' : `Signup failed (${res.status}). Please try again or contact support.`)
        setLoading(false)
        return
      }

      if (!res.ok) {
        setError(json.error ?? 'Signup failed')
        setLoading(false)
        return
      }

      router.push('/login?from=register&message=' + encodeURIComponent('Account created. Please sign in.') + '&email=' + encodeURIComponent(form.email))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Signup failed')
      setLoading(false)
    }
  }

  const inputClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8">
      <div className="flex items-center gap-2 mb-6">
        {[1, 2].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
              step >= s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
            )}>{s}</div>
            {s < 2 && <div className={cn('h-0.5 w-8', step > s ? 'bg-blue-600' : 'bg-gray-200')} />}
          </div>
        ))}
        <span className="ml-2 text-sm text-gray-500">{step === 1 ? 'Personal details' : 'Contact & security'}</span>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h2>
      <p className="text-gray-500 text-sm mb-6">Step {step} of 2. After this, you’ll sign in and choose a programme to apply for.</p>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>}

      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First name *</label>
              <input value={form.first_name} onChange={e => set('first_name', e.target.value)} className={inputClass} placeholder="John" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last name *</label>
              <input value={form.last_name} onChange={e => set('last_name', e.target.value)} className={inputClass} placeholder="Smith" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SA ID number *</label>
            <input value={form.id_number} onChange={e => set('id_number', e.target.value)} className={inputClass} placeholder="8001015009087" maxLength={13} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email address *</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputClass} placeholder="you@example.com" />
          </div>
          <button
            onClick={() => {
              if (!form.first_name || !form.last_name || !form.email || !form.id_number) {
                setError('Please fill in all required fields')
                return
              }
              setError(null)
              setStep(2)
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
          >
            Next
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone number *</label>
            <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className={inputClass} placeholder="0821234567" inputMode="tel" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <input type="password" value={form.password} onChange={e => set('password', e.target.value)} className={inputClass} placeholder="At least 8 characters" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password *</label>
            <input type="password" value={form.confirm_password} onChange={e => set('confirm_password', e.target.value)} className={inputClass} placeholder="Repeat your password" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setError(null); setStep(1) }}
              className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-sm">
              Back
            </button>
            <button onClick={submitRegistration} disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 rounded-lg transition-colors text-sm">
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>
        </div>
      )}

      <p className="text-center text-sm text-gray-500 mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-600 font-medium hover:underline">Sign in</Link>
      </p>
    </div>
  )
}
