import { INSTALMENT_TERMS } from '@/content/programme-fees'

export function PaymentTerms({ className = '' }: { className?: string }) {
  return <p className={className}>{INSTALMENT_TERMS}</p>
}
