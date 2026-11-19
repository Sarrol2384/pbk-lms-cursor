/**
 * Partnership copy and service fees for The Indagation Institute (TII).
 * Fees are full US dollar amounts. Edit INDAGATION_FEES when prices change.
 */

export const INDAGATION_PATH = '/research-support'

export const INDAGATION_SERVICE_IDS = ['proposal', 'analysis', 'report', 'consultancy'] as const

export type IndagationServiceId = (typeof INDAGATION_SERVICE_IDS)[number]

export type IndagationFeeAmounts = Record<IndagationServiceId, number>

export type IndagationFeeLevel = {
  id: string
  label: string
  /** Null when the level has no fixed price list. */
  amounts: IndagationFeeAmounts | null
  note: string | null
}

export const INDAGATION_FEES = {
  currency: 'USD',
  services: [
    { id: 'proposal', label: 'Research proposal writing' },
    { id: 'analysis', label: 'Data analysis' },
    { id: 'report', label: 'Report writing' },
    { id: 'consultancy', label: 'Research consultancy' },
  ],
  levels: [
    {
      id: 'bachelors',
      label: "Bachelor's degree (all fields)",
      amounts: {
        proposal: 159.57,
        analysis: 132.98,
        report: 159.57,
        consultancy: 132.98,
      },
      note: null,
    },
    {
      id: 'masters',
      label: "Master's degree (all fields)",
      amounts: {
        proposal: 265.96,
        analysis: 159.57,
        report: 265.96,
        consultancy: 132.98,
      },
      note: null,
    },
    {
      id: 'phd-social',
      label: 'PhD programmes, social research',
      amounts: {
        proposal: 425.53,
        analysis: 265.96,
        report: 425.53,
        consultancy: 132.98,
      },
      note: null,
    },
    {
      id: 'phd-scientific',
      label: 'PhD scientific research',
      amounts: null,
      note: 'Prices depend on the kind of research.',
    },
  ],
} as const satisfies {
  currency: 'USD'
  services: readonly { id: IndagationServiceId; label: string }[]
  levels: readonly IndagationFeeLevel[]
}

export const INDAGATION_PARTNERSHIP = {
  path: INDAGATION_PATH,
  heading: 'The Indagation Institute (TII) and PBK Memorial Leadership Institute',
  tagline: 'Strategic partners for quality research and academic excellence',
  about:
    'The Indagation Institute is a premier academic support and research consultancy institution committed to empowering students and researchers at every level of their academic journey. We are proud to partner with PBK Memorial Leadership Institute to provide its students with access to The Indagation Institute services, leveraging our proven expertise as a legitimate and reputable research organisation.',
  services: [
    'Research proposal writing',
    'Data analysis',
    'Report writing',
    'Research consultancy',
  ],
  benefitsTitle: 'PBK student benefits',
  benefits: [
    'Access to TII services for research support, training and consultancy',
    'A trusted and legitimate research organisation',
  ],
  email: 'indagationinstitute@gmail.com',
  whatsAppDisplay: '+260 766 100 934',
  whatsAppHref: 'https://wa.me/260766100934',
  slogan: 'Augmenting critical thinking and problem solving.',
  teaser:
    'PBK students can use research support from The Indagation Institute (TII), a strategic partner for quality research and academic excellence.',
} as const

export const INDAGATION_WHATSAPP_LINK = {
  href: INDAGATION_PARTNERSHIP.whatsAppHref,
  target: '_blank',
  rel: 'noopener noreferrer',
} as const

export const INDAGATION_META_DESCRIPTION =
  'The Indagation Institute (TII) and PBK Memorial Leadership Institute are strategic partners for quality research and academic excellence. Research support fees are in US dollars.'

/** Full US dollar amount, with cents. No tax wording. */
export function formatUsd(amount: number): string {
  const cents = Math.round(Math.abs(amount) * 100)
  const whole = Math.floor(cents / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')
  const fraction = String(cents % 100).padStart(2, '0')
  return `USD ${whole}.${fraction}`
}
