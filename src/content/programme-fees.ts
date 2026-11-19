/**
 * Cyril's approved programme fees, in whole US dollars.
 *
 * This module is the published source. Migration 00034 is the same schedule
 * for the database, and it is not applied from the pull request.
 * `courses.fee` is a separate stored course total. This module does not
 * change those rows, and it does not convert them.
 *
 * Registration for programmes that are not Master's or PhD (RPL) is one
 * setting, `STANDARD_REGISTRATION_USD`. It is unset on purpose.
 * Do not replace null with a guessed number.
 *
 * Chaplaincy registration is also $100, and that rule is not implemented here.
 * Chaplaincy stays on the theology tuition totals and on the unset standard
 * registration amount.
 */

export const FEE_TRACKS = ['academic', 'theology'] as const
export type FeeTrack = (typeof FEE_TRACKS)[number]

export const STUDY_LEVEL_IDS = [
  'certificate',
  'advanced_certificate',
  'diploma',
  'advanced_diploma',
  'bachelors',
  'masters_rpl',
  'phd_rpl',
] as const
export type StudyLevelId = (typeof STUDY_LEVEL_IDS)[number]

export const THEOLOGY_SCHOOL_ID = 'theology-ministry'
export const CERTIFICATE_ONLY_PROGRAMME_ID = 'certificate-in-climate-change'

export const ACADEMIC_LADDER = [
  'certificate',
  'advanced_certificate',
  'diploma',
  'advanced_diploma',
  'bachelors',
] as const satisfies readonly StudyLevelId[]

export const THEOLOGY_LADDER = [
  ...ACADEMIC_LADDER,
  'masters_rpl',
  'phd_rpl',
] as const satisfies readonly StudyLevelId[]

/** Whole US dollars. Known amount for Master's and PhD (RPL) only. */
export const RPL_REGISTRATION_USD = 100

/**
 * TODO: standard registration amount for programmes that are not RPL.
 * Cyril has not approved a number. Leave this null.
 */
export const STANDARD_REGISTRATION_USD: number | null = null

export const LEVEL_LABEL: Record<StudyLevelId, string> = {
  certificate: 'Certificate',
  advanced_certificate: 'Advanced Certificate',
  diploma: 'Diploma',
  advanced_diploma: 'Advanced Diploma',
  bachelors: "Bachelor's",
  masters_rpl: "Master's (RPL)",
  phd_rpl: 'PhD (RPL)',
}

type LevelSpec = {
  name: string
  tuitionUsd: number
  duration: string
  offeredOnProspectus: boolean
}

const SPEC: Record<FeeTrack, Record<StudyLevelId, LevelSpec>> = {
  academic: {
    certificate: { name: 'Certificate', tuitionUsd: 500, duration: '6-12 months', offeredOnProspectus: true },
    advanced_certificate: { name: 'Advanced Certificate', tuitionUsd: 800, duration: '1 year', offeredOnProspectus: true },
    diploma: { name: 'Diploma', tuitionUsd: 1800, duration: '2 years', offeredOnProspectus: true },
    advanced_diploma: { name: 'Advanced Diploma', tuitionUsd: 2800, duration: '3 years', offeredOnProspectus: true },
    bachelors: { name: "Bachelor's", tuitionUsd: 6000, duration: '3-4 years', offeredOnProspectus: true },
    masters_rpl: { name: "Master's (RPL)", tuitionUsd: 2500, duration: '1-1.5 years', offeredOnProspectus: false },
    phd_rpl: { name: 'PhD (RPL)', tuitionUsd: 5000, duration: '2-3 years', offeredOnProspectus: false },
  },
  theology: {
    certificate: { name: 'Certificate in Theology/Ministry', tuitionUsd: 150, duration: '6 months', offeredOnProspectus: true },
    advanced_certificate: { name: 'Advanced Certificate in Theology', tuitionUsd: 300, duration: '1 year', offeredOnProspectus: true },
    diploma: { name: 'Diploma in Theology/Divinity', tuitionUsd: 600, duration: '2 years', offeredOnProspectus: true },
    advanced_diploma: { name: 'Advanced Diploma in Theology', tuitionUsd: 1000, duration: '3 years', offeredOnProspectus: true },
    bachelors: { name: "Bachelor's in Theology/Biblical Studies", tuitionUsd: 1800, duration: '3-4 years', offeredOnProspectus: true },
    masters_rpl: { name: "Master's in Theology (RPL)", tuitionUsd: 1200, duration: '1 year', offeredOnProspectus: true },
    phd_rpl: { name: 'PhD in Theology (RPL)', tuitionUsd: 2500, duration: '2-3 years', offeredOnProspectus: true },
  },
}

export type FeeScheduleRow = {
  track: FeeTrack
  level: StudyLevelId
  name: string
  tuitionUsd: number
  duration: string
  registrationUsd: number | null
  offeredOnProspectus: boolean
}

export const PROGRAMME_FEE_SCHEDULE: readonly FeeScheduleRow[] = FEE_TRACKS.flatMap(track =>
  STUDY_LEVEL_IDS.map(level => {
    const spec = SPEC[track][level]
    return {
      track,
      level,
      name: spec.name,
      tuitionUsd: spec.tuitionUsd,
      duration: spec.duration,
      registrationUsd: isRplLevel(level) ? RPL_REGISTRATION_USD : STANDARD_REGISTRATION_USD,
      offeredOnProspectus: spec.offeredOnProspectus,
    }
  }),
)

export function isRplLevel(level: StudyLevelId): level is 'masters_rpl' | 'phd_rpl' {
  return level === 'masters_rpl' || level === 'phd_rpl'
}

export function trackForSchool(schoolId: string): FeeTrack {
  return schoolId === THEOLOGY_SCHOOL_ID ? 'theology' : 'academic'
}

export function levelsForProgramme(schoolId: string, programmeId: string): readonly StudyLevelId[] {
  if (programmeId === CERTIFICATE_ONLY_PROGRAMME_ID) return ['certificate']
  return trackForSchool(schoolId) === 'theology' ? THEOLOGY_LADDER : ACADEMIC_LADDER
}

export function scheduleRow(track: FeeTrack, level: StudyLevelId): FeeScheduleRow {
  const row = PROGRAMME_FEE_SCHEDULE.find(item => item.track === track && item.level === level)
  if (!row) throw new Error(`No fee for ${track} ${level}`)
  return row
}

export function registrationAmount(level: StudyLevelId): number | null {
  return isRplLevel(level) ? RPL_REGISTRATION_USD : STANDARD_REGISTRATION_USD
}

export function registrationSentence(level: StudyLevelId, format: (amount: number) => string): string {
  const amount = registrationAmount(level)
  if (amount == null) return 'Registration for this programme has not been set.'
  return `Registration is ${format(amount)}.`
}

export function choiceLabel(
  levelLabel: string,
  track: FeeTrack,
  level: StudyLevelId,
  format: (amount: number) => string,
): string {
  const row = scheduleRow(track, level)
  return `${levelLabel} (${row.duration}) — ${format(row.tuitionUsd)}`
}

const SHARED_ENTRY: Record<(typeof ACADEMIC_LADDER)[number], string> = {
  certificate: 'Grade 9 or Grade 12. Open to anyone with an interest in the field.',
  advanced_certificate: 'Admission for Advanced Certificate is confirmed when the application is reviewed.',
  diploma: 'A Grade 12 certificate, plus a certificate in a relevant field.',
  advanced_diploma: 'A diploma in a relevant field.',
  bachelors: "Admission for Bachelor's is confirmed when the application is reviewed.",
}

export function entryRequirement(track: FeeTrack, level: StudyLevelId): string {
  if (!isRplLevel(level)) return SHARED_ENTRY[level]
  if (track === 'academic' && level === 'masters_rpl') {
    return "Approved price only. Master's via RPL is not listed on academic programmes in this prospectus."
  }
  if (track === 'academic' && level === 'phd_rpl') {
    return 'Approved price only. PhD via RPL is not listed on academic programmes in this prospectus.'
  }
  if (level === 'masters_rpl') return 'Recognition of Prior Learning (RPL) on a Theology & Ministry programme.'
  return 'Recognition of Prior Learning (RPL) on a Theology & Ministry programme. Prior learning is assessed for doctoral entry.'
}

export function nextStep(track: FeeTrack, level: StudyLevelId): string {
  if (track === 'academic' && level === 'bachelors') {
    return "Further study where a programme lists it. Master's and PhD via RPL are not listed on academic programmes."
  }
  if (track === 'academic' && isRplLevel(level)) {
    return 'Not listed on academic programmes in this prospectus.'
  }
  if (level === 'phd_rpl') return 'Highest PBK study level'
  const order: readonly StudyLevelId[] = track === 'theology' ? THEOLOGY_LADDER : ACADEMIC_LADDER
  const following = order[order.indexOf(level) + 1]
  if (!following) return 'Highest PBK study level'
  if (isRplLevel(following)) return `${LEVEL_LABEL[following]}, on a Theology & Ministry programme`
  return `${LEVEL_LABEL[following]}, where you meet the admission requirement`
}

export type PathwayFact = {
  level: StudyLevelId
  levelLabel: string
  qualificationName: string
  entryRequirement: string
  duration: string
  tuitionUsd: number
  registrationUsd: number | null
  nextStep: string
  offeredOnProspectus: boolean
}

export function pathwayFacts(track: FeeTrack): PathwayFact[] {
  return STUDY_LEVEL_IDS.map(level => {
    const row = scheduleRow(track, level)
    return {
      level,
      levelLabel: LEVEL_LABEL[level],
      qualificationName: row.name,
      entryRequirement: entryRequirement(track, level),
      duration: row.duration,
      tuitionUsd: row.tuitionUsd,
      registrationUsd: row.registrationUsd,
      nextStep: nextStep(track, level),
      offeredOnProspectus: row.offeredOnProspectus,
    }
  })
}

export const STUDY_PATHWAY_INTRO = {
  title: 'Your academic pathway at PBK Memorial',
  body: 'PBK Memorial Management and Leadership Institute offers globally accredited programmes. You can progress from a certificate through to doctoral study where that level is offered. These are PBK study levels. They are not registered with the South African Qualifications Authority (SAQA), and they are not registered on the National Qualifications Framework (NQF).',
}

export const PROGRESSION_NOTES = [
  'Entry requirements: Use the admission requirement for the level you are applying for.',
  "Recognition of Prior Learning (RPL) is only for Master's and PhD. It is not used for Certificate, Advanced Certificate, Diploma, Advanced Diploma, or Bachelor's.",
  "Master's and PhD via RPL are listed on Theology & Ministry programmes. Academic prices for those levels are approved, and those qualifications are not listed on academic programmes in this prospectus.",
  "Registration is $100 for Master's and PhD (RPL). Registration for other programmes has not been set.",
  'Accreditation: PBK programmes are globally accredited.',
  'Bridging courses: PBK offers bridging programmes for learners who do not meet the direct admission requirement for their chosen qualification.',
] as const
