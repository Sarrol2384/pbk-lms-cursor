import { LEGACY_HEADING, LEGACY_PARAGRAPHS, LEGACY_QUOTE, LEGACY_TAGLINE } from '@/content/legacy'

export function LegacyTribute() {
  const yearsAt = LEGACY_HEADING.lastIndexOf('(')
  const title = yearsAt > 0 ? LEGACY_HEADING.slice(0, yearsAt).trim() : LEGACY_HEADING
  const years = yearsAt > 0 ? LEGACY_HEADING.slice(yearsAt) : ''

  return (
    <section id="legacy" className="py-16 px-4 bg-blue-950 text-white scroll-mt-28">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-balance">
          {title}{years ? ' ' : ''}
          {years ? <span className="whitespace-nowrap">{years}</span> : null}
        </h2>
        <p className="font-serif text-lg sm:text-xl text-blue-100 mb-6">{LEGACY_TAGLINE}</p>
        <blockquote className="border-l-4 border-blue-300 pl-4 mb-8">
          <p className="font-serif text-lg sm:text-xl text-white leading-snug">{LEGACY_QUOTE}</p>
        </blockquote>
        <div className="space-y-4">
          {LEGACY_PARAGRAPHS.map(paragraph => (
            <p key={paragraph} className="text-blue-100 leading-relaxed">{paragraph}</p>
          ))}
        </div>
      </div>
    </section>
  )
}
