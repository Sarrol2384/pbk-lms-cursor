export function PageHero({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white py-16 sm:py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-3xl sm:text-5xl font-bold mb-4 leading-tight">{title}</h1>
        {subtitle && <p className="text-blue-100 text-lg max-w-2xl mx-auto">{subtitle}</p>}
      </div>
    </section>
  )
}
