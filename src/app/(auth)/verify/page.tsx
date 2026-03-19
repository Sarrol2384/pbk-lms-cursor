'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

function VerifyContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'pending' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [resendSent, setResendSent] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const emailFromUrl = searchParams.get('email') ?? ''
  const exchangeStarted = useRef(false)

  useEffect(() => {
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const errorDesc = searchParams.get('error_description')

    if (error) {
      setStatus('error')
      setMessage(errorDesc || 'Verification failed. The link may have expired.')
      return
    }

    if (code) {
      if (exchangeStarted.current) return
      exchangeStarted.current = true

      const supabase = createClient()
      supabase.auth.exchangeCodeForSession(code).then(async ({ error: exchangeError }) => {
        if (exchangeError) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            setStatus('success')
            setMessage('Redirecting you now...')
            await fetch('/api/profile/sync-from-auth', { method: 'POST' })
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
            setTimeout(() => {
              const role = profile?.role
              if (role === 'super_admin' || role === 'admin') router.push('/admin/dashboard')
              else if (role === 'lecturer') router.push('/lecturer/dashboard')
              else router.push('/student/courses')
            }, 1500)
          } else {
            setStatus('error')
            setMessage('Could not verify your email. Please try again.')
          }
        } else {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            await fetch('/api/profile/sync-from-auth', { method: 'POST' })
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
            setStatus('success')
            setMessage('Redirecting you now...')
            setTimeout(() => {
              const role = profile?.role
              if (role === 'super_admin' || role === 'admin') router.push('/admin/dashboard')
              else if (role === 'lecturer') router.push('/lecturer/dashboard')
              else router.push('/student/courses')
            }, 1500)
          }
        }
      })
    } else {
      setStatus('pending')
      setMessage('We sent a verification link to your email. Click it to activate your account. Didn’t get it? Check spam or use Resend below.')
    }
  }, [searchParams, router])

  async function resendVerification() {
    const email = emailFromUrl.trim()
    if (!email) return
    setResendLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    setResendLoading(false)
    if (error) setMessage('Could not resend: ' + error.message)
    else setResendSent(true)
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
      {status === 'loading' && (
        <>
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Verifying your email...</h2>
        </>
      )}
      {status === 'pending' && (
        <>
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
          <p className="text-gray-500 text-sm mb-4">{message}</p>
          {emailFromUrl && (
            <div className="mb-4">
              <button
                type="button"
                onClick={resendVerification}
                disabled={resendLoading || resendSent}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {resendLoading ? 'Sending...' : resendSent ? 'Verification email sent again' : 'Resend verification email'}
              </button>
            </div>
          )}
          <p className="text-gray-500 text-xs mb-2">After you click the link in the email, sign in and go to My Courses to apply for a programme.</p>
          <p className="text-gray-500 text-xs mb-2">Use the <strong>most recent</strong> verification email—older links may no longer work.</p>
          <p className="text-gray-500 text-xs mb-3">No email received? Try <strong>Sign in</strong> anyway—your account may already be active.</p>
          <Link href="/login" className="text-blue-600 font-medium hover:underline text-sm">Sign in</Link>
        </>
      )}
      {status === 'success' && (
        <>
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Email verified!</h2>
          <p className="text-gray-500 text-sm mb-4">{message}</p>
        </>
      )}
      {status === 'error' && (
        <>
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Verification failed</h2>
          <p className="text-gray-500 text-sm mb-4">{message}</p>
          <Link href="/login" className="text-blue-600 text-sm font-medium hover:underline">Back to login</Link>
        </>
      )}
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
          <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Loading...</h2>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  )
}
