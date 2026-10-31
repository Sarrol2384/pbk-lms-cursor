'use client'

import { useMemo, useState } from 'react'
import { DEFAULT_COUNTRY } from '@/content/countries'
import {
  findProgramme,
  highestQualifications,
  programmeOffersRpl,
  prospectusSchools,
  studyLevelChoiceLabel,
  studyLevels,
  studyLevelsForProgramme,
  studyModes,
  type StudyLevelId,
} from '@/content/prospectus'
import { INSTITUTE_EMAIL, INSTITUTE_NAME } from '@/lib/institute'
import { CountrySelect } from '@/components/marketing/CountrySelect'

const inputClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
const labelClass = 'block text-sm font-medium text-gray-800 mb-1'

type Errors = Record<string, string>

export function PublicApplicationForm({ initialProgrammeId }: { initialProgrammeId?: string }) {
  const starting = findProgramme(initialProgrammeId || '')
  const [programmeId, setProgrammeId] = useState(starting?.programme.id ?? '')
  const [level, setLevel] = useState<StudyLevelId | ''>(starting?.programme.levels[0] ?? '')
  const [country, setCountry] = useState(DEFAULT_COUNTRY)
  const [studyMode, setStudyMode] = useState('')
  const [qualification, setQualification] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [message, setMessage] = useState<string | null>(null)
  const [reference, setReference] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const selected = useMemo(() => findProgramme(programmeId), [programmeId])
  const levelOptions = studyLevelsForProgramme(selected?.programme ?? null)
  const levelHint = studyLevels.find(item => item.id === level)
  const idLabel = country === DEFAULT_COUNTRY ? 'ID number' : 'ID or passport number'

  function onProgrammeChange(nextId: string) {
    setProgrammeId(nextId)
    const next = findProgramme(nextId)
    if (!next) {
      setLevel('')
      return
    }
    if (!level || !next.programme.levels.includes(level)) {
      setLevel(next.programme.levels[0] ?? '')
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setErrors({})
    setMessage(null)
    try {
      const form = new FormData(event.currentTarget)
      const response = await fetch('/api/public/apply', { method: 'POST', body: form })
      const data = await response.json().catch(() => ({})) as {
        ok?: boolean
        errors?: Errors
        message?: string
        reference?: string
        warning?: string | null
      }
      if (!response.ok || !data.ok) {
        setErrors(data.errors ?? {})
        setMessage(data.message || 'Please check the form and try again.')
        return
      }
      setReference(data.reference || null)
      setMessage(data.warning || null)
    } catch {
      setMessage(`We could not submit the form. Please email ${INSTITUTE_EMAIL}.`)
    } finally {
      setLoading(false)
    }
  }

  if (reference) {
    return (
      <div className="bg-white border border-green-200 rounded-xl p-8 text-center shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Application received</h2>
        <p className="text-gray-600 text-sm leading-relaxed">
          Thank you. Your reference is <strong className="text-gray-900">{reference}</strong>.
          We have emailed an acknowledgement to you, and the admissions team will be in touch.
        </p>
        {message && <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mt-4">{message}</p>}
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="relative bg-white border border-gray-200 rounded-xl shadow-sm" noValidate>
      <div className="h-1.5 bg-blue-700 rounded-t-xl" aria-hidden />
      <div className="p-6 sm:p-8 space-y-8">
        <p className="text-sm text-gray-500">Fields marked with * are required. This form does not create a student account.</p>
        {message && <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{message}</div>}

        <fieldset className="space-y-4">
          <legend className="text-lg font-bold text-gray-900 mb-2">Personal and contact details</legend>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className={labelClass}>First name *</label>
              <input id="firstName" name="firstName" autoComplete="given-name" required className={inputClass} />
              {errors.firstName && <p className="text-xs text-red-600 mt-1">{errors.firstName}</p>}
            </div>
            <div>
              <label htmlFor="lastName" className={labelClass}>Surname *</label>
              <input id="lastName" name="lastName" autoComplete="family-name" required className={inputClass} />
              {errors.lastName && <p className="text-xs text-red-600 mt-1">{errors.lastName}</p>}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className={labelClass}>Email address *</label>
              <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} />
              {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
            </div>
            <div>
              <label htmlFor="phone" className={labelClass}>Phone number *</label>
              <input id="phone" name="phone" type="tel" autoComplete="tel" required className={inputClass} placeholder="082 000 0000" />
              {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
            </div>
          </div>
          <CountrySelect value={country} onChange={setCountry} error={errors.country} />
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="idNumber" className={labelClass}>{idLabel}</label>
              <input id="idNumber" name="idNumber" autoComplete="off" className={inputClass} />
            </div>
            <div>
              <label htmlFor="city" className={labelClass}>Town or city</label>
              <input id="city" name="city" autoComplete="address-level2" className={inputClass} />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-lg font-bold text-gray-900 mb-2">Programme</legend>
          <div>
            <label htmlFor="programmeId" className={labelClass}>Programme *</label>
            <select
              id="programmeId"
              name="programmeId"
              required
              className={inputClass}
              value={programmeId}
              onChange={event => onProgrammeChange(event.target.value)}
            >
              <option value="">Choose a programme</option>
              {prospectusSchools.map((school, index) => (
                <optgroup key={school.id} label={`School ${index + 1}: ${school.name}`}>
                  {school.programmes.map(programme => (
                    <option key={programme.id} value={programme.id}>
                      {programme.name}{programme.isNew ? ' (New)' : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {errors.programmeId && <p className="text-xs text-red-600 mt-1">{errors.programmeId}</p>}
          </div>
          <div>
            <label htmlFor="level" className={labelClass}>Level *</label>
            <select
              id="level"
              name="level"
              required
              className={inputClass}
              value={level}
              onChange={event => setLevel(event.target.value as StudyLevelId)}
            >
              <option value="">Choose a level</option>
              {levelOptions.map(item => (
                <option key={item.id} value={item.id}>{studyLevelChoiceLabel(item)}</option>
              ))}
            </select>
            {selected && (
              <p className="text-xs text-gray-600 mt-1">
                Available for this programme: {levelOptions.map(item => studyLevelChoiceLabel(item)).join(', ')}.
              </p>
            )}
            {selected && programmeOffersRpl(selected.programme) && (
              <p className="text-xs text-blue-800 mt-1">
                This programme can be applied for up to Masters and PhD via Recognition of Prior Learning (RPL).
              </p>
            )}
            {levelHint && <p className="text-xs text-gray-500 mt-1">{levelHint.admission}</p>}
            {errors.level && <p className="text-xs text-red-600 mt-1">{errors.level}</p>}
          </div>
          <div>
            <p className={labelClass}>Study mode *</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {studyModes.map(mode => (
                <label key={mode.id} className="flex items-center gap-2 text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2">
                  <input
                    type="radio"
                    name="studyMode"
                    value={mode.id}
                    checked={studyMode === mode.id}
                    onChange={() => setStudyMode(mode.id)}
                    required
                  />
                  {mode.label}
                </label>
              ))}
            </div>
            {errors.studyMode && <p className="text-xs text-red-600 mt-1">{errors.studyMode}</p>}
          </div>
          <div>
            <label htmlFor="highestQualification" className={labelClass}>Highest qualification *</label>
            <select
              id="highestQualification"
              name="highestQualification"
              required
              className={inputClass}
              value={qualification}
              onChange={event => setQualification(event.target.value)}
            >
              <option value="">Choose one</option>
              {highestQualifications.map(item => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            {errors.highestQualification && <p className="text-xs text-red-600 mt-1">{errors.highestQualification}</p>}
          </div>
          {qualification === 'Other' && (
            <div>
              <label htmlFor="highestQualificationOther" className={labelClass}>Please name your qualification *</label>
              <input id="highestQualificationOther" name="highestQualificationOther" required className={inputClass} />
              {errors.highestQualificationOther && <p className="text-xs text-red-600 mt-1">{errors.highestQualificationOther}</p>}
            </div>
          )}
          <div>
            <label htmlFor="document" className={labelClass}>Supporting document (optional)</label>
            <input id="document" name="document" type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" className="block w-full text-sm text-gray-600" />
            <p className="text-xs text-gray-500 mt-1">PDF, JPG or PNG, up to 5 MB. For example an ID copy or your highest qualification.</p>
            {errors.document && <p className="text-xs text-red-600 mt-1">{errors.document}</p>}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-lg font-bold text-gray-900 mb-2">Consent</legend>
          <label className="flex items-start gap-3 text-sm text-gray-700 leading-relaxed">
            <input type="checkbox" name="popiaConsent" value="true" required className="mt-1" />
            <span>
              I consent to {INSTITUTE_NAME} collecting and processing the personal information in this form so that the institute can consider my application, contact me, and keep a record of it, in line with the Protection of Personal Information Act (POPIA). I may ask for access to or correction of my information by emailing {INSTITUTE_EMAIL}. *
            </span>
          </label>
          {errors.popiaConsent && <p className="text-xs text-red-600 mt-1">{errors.popiaConsent}</p>}
        </fieldset>

        <div aria-hidden="true" className="absolute left-[-9999px] h-0 overflow-hidden">
          <label>
            Company website
            <input name="pbk_hp_field" tabIndex={-1} autoComplete="off" defaultValue="" />
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto bg-blue-700 hover:bg-blue-800 disabled:bg-gray-300 text-white font-semibold px-8 py-3 rounded-xl text-sm"
        >
          {loading ? 'Submitting…' : 'Submit application'}
        </button>
      </div>
    </form>
  )
}
