'use client'

import { partnerLogos } from '@/content/marketing'

function LogoCircle({ name, src }: { name: string; src: string }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white border-2 border-blue-100 shadow-sm mx-4"
      title={name}
    >
      <img
        src={src}
        alt={name}
        className="w-[70%] h-[70%] object-contain"
        loading="lazy"
      />
    </div>
  )
}

export function PartnerLogoMarquee() {
  const track = [...partnerLogos, ...partnerLogos]

  return (
    <section className="py-10 sm:py-12 border-y border-blue-100 bg-blue-50/50 overflow-hidden">
      <h2 className="text-center text-sm font-semibold text-blue-800 uppercase tracking-wide mb-8 px-4">
        Our partners &amp; accreditations
      </h2>

      {/* Animated marquee */}
      <div className="relative motion-reduce:hidden">
        <div className="flex w-max animate-marquee">
          {track.map((logo, i) => (
            <LogoCircle key={`${logo.id}-${i}`} name={logo.name} src={logo.src} />
          ))}
        </div>
      </div>

      {/* Static fallback when user prefers reduced motion */}
      <div className="hidden motion-reduce:flex flex-wrap justify-center gap-4 px-4 max-w-6xl mx-auto">
        {partnerLogos.map(logo => (
          <LogoCircle key={logo.id} name={logo.name} src={logo.src} />
        ))}
      </div>
    </section>
  )
}
