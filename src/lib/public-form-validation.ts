import { canonicalCountry } from '@/content/countries'
import {
  findProgramme,
  highestQualifications,
  studyLevelById,
  studyModeById,
  type StudyLevelId,
  type StudyModeId,
} from '@/content/prospectus'

export type FieldErrors = Record<string, string>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function clean(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, max)
}

function digits(value: string): string {
  return value.replace(/\D/g, '')
}

export type ApplicationInput = {
  firstName: string
  lastName: string
  email: string
  phone: string
  idNumber: string
  city: string
  country: string
  programmeId: string
  level: StudyLevelId
  studyMode: StudyModeId
  highestQualification: string
  highestQualificationOther: string
  popiaConsent: boolean
  programmeName: string
  schoolName: string
  levelLabel: string
  studyModeLabel: string
  qualificationLabel: string
}

export function validateApplication(raw: {
  firstName?: unknown
  lastName?: unknown
  email?: unknown
  phone?: unknown
  idNumber?: unknown
  city?: unknown
  country?: unknown
  programmeId?: unknown
  level?: unknown
  studyMode?: unknown
  highestQualification?: unknown
  highestQualificationOther?: unknown
  popiaConsent?: unknown
}): { ok: true; value: ApplicationInput } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {}
  const firstName = clean(raw.firstName, 80)
  const lastName = clean(raw.lastName, 80)
  const email = clean(raw.email, 200).toLowerCase()
  const phone = clean(raw.phone, 30)
  const idNumber = clean(raw.idNumber, 32)
  const city = clean(raw.city, 80)
  const country = canonicalCountry(clean(raw.country, 80))
  const programmeId = clean(raw.programmeId, 80)
  const level = clean(raw.level, 40)
  const studyMode = clean(raw.studyMode, 40)
  const highestQualification = clean(raw.highestQualification, 80)
  const highestQualificationOther = clean(raw.highestQualificationOther, 120)
  const popiaConsent = raw.popiaConsent === true || raw.popiaConsent === 'true' || raw.popiaConsent === 'on'

  if (firstName.length < 2) errors.firstName = 'Enter your first name.'
  if (lastName.length < 2) errors.lastName = 'Enter your surname.'
  if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.'
  if (digits(phone).length < 7) errors.phone = 'Enter a phone number we can reach you on.'
  if (!country) errors.country = 'Choose your country.'

  const match = findProgramme(programmeId)
  if (!match) errors.programmeId = 'Choose a programme from the 2027 prospectus.'

  const levelInfo = studyLevelById(level)
  if (!levelInfo) errors.level = 'Choose a level offered for this programme.'
  else if (match && !match.programme.levels.includes(levelInfo.id)) {
    const offered = match.programme.levels.map(id => studyLevelById(id)?.label).filter(Boolean).join(', ')
    const rplOnly = levelInfo.id === 'masters_rpl' || levelInfo.id === 'phd_rpl'
    errors.level = rplOnly
      ? `${match.programme.name} is offered at ${offered}. Recognition of Prior Learning (RPL) applies only to Masters and PhD on Theology & Ministry programmes.`
      : `${match.programme.name} is offered at ${offered}.`
  }

  const modeInfo = studyModeById(studyMode)
  if (!modeInfo) errors.studyMode = 'Choose a study mode.'

  if (!highestQualifications.includes(highestQualification as (typeof highestQualifications)[number])) {
    errors.highestQualification = 'Choose your highest qualification.'
  } else if (highestQualification === 'Other' && highestQualificationOther.length < 2) {
    errors.highestQualificationOther = 'Tell us your highest qualification.'
  }

  if (!popiaConsent) errors.popiaConsent = 'POPIA consent is required before we can accept your application.'

  if (Object.keys(errors).length > 0 || !match || !levelInfo || !modeInfo || !country) {
    return { ok: false, errors }
  }

  const qualificationLabel = highestQualification === 'Other'
    ? `Other: ${highestQualificationOther}`
    : highestQualification

  return {
    ok: true,
    value: {
      firstName,
      lastName,
      email,
      phone,
      idNumber,
      city,
      country,
      programmeId,
      level: levelInfo.id,
      studyMode: modeInfo.id,
      highestQualification,
      highestQualificationOther,
      popiaConsent,
      programmeName: match.programme.name,
      schoolName: match.school.name,
      levelLabel: levelInfo.label,
      studyModeLabel: modeInfo.label,
      qualificationLabel,
    },
  }
}

export type ContactInput = {
  name: string
  email: string
  phone: string
  subject: string
  message: string
  popiaConsent: boolean
}

export function validateContact(raw: {
  name?: unknown
  email?: unknown
  phone?: unknown
  subject?: unknown
  message?: unknown
  popiaConsent?: unknown
}): { ok: true; value: ContactInput } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {}
  const name = clean(raw.name, 120)
  const email = clean(raw.email, 200).toLowerCase()
  const phone = clean(raw.phone, 30)
  const subject = clean(raw.subject, 160)
  const message = typeof raw.message === 'string' ? raw.message.replace(/\r\n/g, '\n').trim().slice(0, 5000) : ''
  const popiaConsent = raw.popiaConsent === true || raw.popiaConsent === 'true' || raw.popiaConsent === 'on'

  if (name.length < 2) errors.name = 'Enter your name.'
  if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.'
  if (digits(phone).length < 7) errors.phone = 'Enter a phone number we can reach you on.'
  if (subject.length < 3) errors.subject = 'Enter a subject.'
  if (message.length < 10) errors.message = 'Enter a message of at least a few words.'
  if (!popiaConsent) errors.popiaConsent = 'POPIA consent is required before we can accept your message.'

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, value: { name, email, phone, subject, message, popiaConsent } }
}
