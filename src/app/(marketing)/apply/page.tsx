import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getMarketingBranding } from '@/lib/marketing/branding'
import { PageHero } from '@/components/marketing/PageHero'
import { applySteps } from '@/content/marketing'

export const metadata: Metadata = {
  title: 'Apply',
  description: 'How to apply and access the student portal',
}

export default async function ApplyPage() {
  const { institutionName } = await getMarketingBranding()
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const supportEmail = process.env.SUPPORT_EMAIL || 'support@pbkleadership.org.za'

  return (
    <>
      <PageHero
        title="Apply"
        subtitle={`Join ${institutionName} — follow the steps below to create your account and enrol in a programme.`}
      />

      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          {user ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-10 text-center">
              <p className="text-green-900 font-medium mb-4">You are signed in. Continue to choose or manage your programmes.</p>
              <Link
                href="/student/courses"
                className="inline-block bg-blue-700 hover:bg-blue-800 text-white font-semibold px-8 py-3 rounded-xl text-sm transition-colors"
              >
                Go to my courses
              </Link>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                href="/register"
                className="text-center bg-blue-700 hover:bg-blue-800 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-sm"
              >
                Create account
              </Link>
              <Link
                href="/login"
                className="text-center border border-gray-300 text-gray-800 font-semibold px-8 py-3.5 rounded-xl hover:bg-gray-50 transition-colors text-sm"
              >
                Sign in (existing students)
              </Link>
            </div>
          )}

          <h2 className="text-xl font-bold text-gray-900 mb-6">How to apply</h2>
          <ol className="space-y-6">
            {applySteps.map(({ step, title, desc }) => (
              <li key={step} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white font-bold text-sm">
                  {step}
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900">{title}</h3>
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">{desc}</p>
                </div>
              </li>
            ))}
          </ol>

          <p className="mt-10 text-sm text-gray-500 text-center">
            Need help? Email{' '}
            <a href={`mailto:${supportEmail}`} className="text-blue-700 hover:underline">
              {supportEmail}
            </a>
          </p>
        </div>
      </section>
    </>
  )
}
