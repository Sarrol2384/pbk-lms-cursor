import { FACEBOOK_LINK } from '@/content/social'
import { cn } from '@/lib/utils'

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0" fill="currentColor">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.84c0-2.52 1.49-3.91 3.78-3.91 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94z" />
    </svg>
  )
}

export function FacebookLink({ className }: { className?: string }) {
  return (
    <a
      {...FACEBOOK_LINK}
      className={cn(
        'inline-flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700',
        className,
      )}
    >
      <FacebookIcon />
      <span>Facebook</span>
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}
