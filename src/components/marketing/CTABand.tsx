import Link from 'next/link'

export function CTABand({
  institutionName,
  title = 'Ready to get started?',
  description,
  primaryHref = '/apply',
  primaryLabel = 'Apply now',
}: {
  institutionName: string
  title?: string
  description?: string
  primaryHref?: string
  primaryLabel?: string
}) {
  const desc =
    description ??
    `Join ${institutionName} and take the next step in your professional development.`

  return (
    <section className="bg-blue-700 text-white py-16 px-4 text-center">
      <h2 className="text-3xl font-bold mb-4">{title}</h2>
      <p className="text-blue-100 mb-8 max-w-xl mx-auto">{desc}</p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          href={primaryHref}
          className="bg-white text-blue-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-50 transition-colors text-sm"
        >
          {primaryLabel}
        </Link>
        <Link
          href="/login"
          className="border border-white/30 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 transition-colors text-sm"
        >
          Sign in to my account
        </Link>
      </div>
    </section>
  )
}
