/**
 * Partnership copy and service fees for The Indagation Institute (TII).
 * Fees are whole US dollars, rounded from the flyer. Edit INDAGATION_FEES when prices change.
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
        proposal: 160,
        analysis: 133,
        report: 160,
        consultancy: 133,
      },
      note: null,
    },
    {
      id: 'masters',
      label: "Master's degree (all fields)",
      amounts: {
        proposal: 266,
        analysis: 160,
        report: 266,
        consultancy: 133,
      },
      note: null,
    },
    {
      id: 'phd-social',
      label: 'PhD programmes, social research',
      amounts: {
        proposal: 426,
        analysis: 266,
        report: 426,
        consultancy: 133,
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
  slogan: 'Augmenting critical thinking and problem solving.',
  teaser:
    'PBK students can use research support from The Indagation Institute (TII), a strategic partner for quality research and academic excellence.',
} as const

/**
 * Study photographs downloaded into the repo. Unsplash Licence: attribution is not required.
 * Photographer names are not printed here because the download did not include them.
 * Source files: photo-1481627834876-b7833e8f5570, photo-1434030216411-0b793f4b4173,
 * photo-1517842645767-c639042777db.
 */
export const INDAGATION_IMAGES = [
  {
    src: '/research/library-shelves.webp',
    alt: 'Bookshelves in a library',
    width: 1200,
    height: 1109,
  },
  {
    src: '/research/study-desk.webp',
    alt: 'A person writing notes at a desk',
    width: 1200,
    height: 800,
  },
  {
    src: '/research/research-notes.webp',
    alt: 'An open notebook with a pen and glasses',
    width: 1200,
    height: 800,
  },
] as const

export const INDAGATION_META_DESCRIPTION =
  'The Indagation Institute (TII) and PBK Memorial Leadership Institute are strategic partners for quality research and academic excellence. Research support fees are in US dollars.'

/** Whole US dollars, with no cents. No tax wording. */
export function formatUsd(amount: number): string {
  const whole = Math.round(Math.abs(amount))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')
  return `USD ${whole}`
}
