import { INSTITUTE_HOTLINE_DISPLAY, INSTITUTE_HOTLINE_TEL } from '@/lib/institute'

/** Always reads "Hotline: 0861 911 911" and dials tel:0861911911. */
export function HotlineLink({ className }: { className?: string }) {
  return (
    <a href={`tel:${INSTITUTE_HOTLINE_TEL}`} className={className}>
      Hotline: {INSTITUTE_HOTLINE_DISPLAY}
    </a>
  )
}
