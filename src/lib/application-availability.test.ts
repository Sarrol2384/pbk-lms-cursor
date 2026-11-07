import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import {
  APPLICATION_NOT_OPEN_DB_MESSAGE,
  APPLICATION_OPENINGS_MIGRATION,
  APPLICATIONS_NOT_OPEN_LABEL,
  applicationInsertRejectedAsClosed,
  availabilityFromQuery,
  applyHeroSubtitle,
  eligibleOpeningPairs,
  homepageAvailabilitySummary,
  levelAfterProgrammeChange,
  levelCanBeOpened,
  levelSelectOptions,
  openLevelIds,
  programmeSelectOption,
  rowsToOpenings,
  type QualificationOpening,
} from '../content/application-availability'
import {
  findProgramme,
  programmeOffersRpl,
  prospectusSchools,
  studyLevels,
  studyLevelsForProgramme,
  type StudyLevelId,
} from '../content/prospectus'
import { validateApplication } from './public-form-validation'

const closed: readonly QualificationOpening[] = []

const approvedSample: readonly QualificationOpening[] = [
  { programmeId: 'theology', levels: ['masters_rpl', 'phd_rpl'] },
  { programmeId: 'chaplaincy', levels: ['certificate'] },
  { programmeId: 'christian-counselling', levels: ['diploma'] },
  { programmeId: 'certificate-in-climate-change', levels: ['certificate'] },
]

function application(overrides: Record<string, unknown> = {}) {
  return {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    phone: '0820000000',
    idNumber: '',
    city: 'Cape Town',
    country: 'South Africa',
    programmeId: 'theology',
    level: 'masters_rpl',
    studyMode: 'online',
    highestQualification: 'Degree or higher',
    highestQualificationOther: '',
    popiaConsent: 'true',
    ...overrides,
  }
}

const programmes = prospectusSchools.flatMap(school => school.programmes)
const levelIds = studyLevels.map(level => level.id)

describe('closed application catalogue', () => {
  it('does not approve any qualification when the openings table has no rows', () => {
    const availability = availabilityFromQuery(null, [])
    assert.equal(availability.databaseEnforced, true)
    assert.deepEqual(availability.openings, [])
    for (const programme of programmes) {
      assert.deepEqual(openLevelIds(programme.id, closed), [])
      assert.equal(programmeSelectOption(programme, closed).disabled, true)
      assert.equal(
        programmeSelectOption(programme, closed).label.endsWith(APPLICATIONS_NOT_OPEN_LABEL),
        true,
      )
      assert.deepEqual(levelSelectOptions(programme.id, closed), [])
    }
  })

  it('fails closed when the openings table cannot be read', () => {
    const missing = availabilityFromQuery({ code: '42P01', message: 'relation does not exist' }, null)
    assert.equal(missing.databaseEnforced, false)
    assert.deepEqual(missing.openings, [])
    assert.equal(applicationInsertRejectedAsClosed({ code: '42501', message: APPLICATION_NOT_OPEN_DB_MESSAGE }), true)
    assert.equal(applicationInsertRejectedAsClosed({ code: '23514' }), false)
  })

  it('rejects every programme and level while nothing is open, including Christian Counselling at all three levels', () => {
    const counselling = ['certificate', 'diploma', 'advanced_diploma']
    for (const level of counselling) {
      const result = validateApplication(application({
        programmeId: 'christian-counselling',
        level,
      }), closed)
      assert.equal(result.ok, false)
      if (!result.ok) {
        assert.match(result.errors.programmeId, /Christian Counselling/)
        assert.match(result.errors.programmeId, new RegExp(APPLICATIONS_NOT_OPEN_LABEL))
        assert.equal(result.errors.level, APPLICATIONS_NOT_OPEN_LABEL)
      }
    }

    for (const programme of programmes) {
      for (const level of levelIds) {
        const result = validateApplication(application({ programmeId: programme.id, level }), closed)
        assert.equal(result.ok, false)
        if (!result.ok) assert.match(result.errors.programmeId, new RegExp(APPLICATIONS_NOT_OPEN_LABEL))
      }
    }
  })

  it('rejects a crafted level and an unknown programme against the live list', () => {
    const crafted = validateApplication(application({
      programmeId: 'christian-counselling',
      level: 'advanced_diploma',
    }), closed)
    assert.equal(crafted.ok, false)

    const unknown = validateApplication(application({ programmeId: 'not-a-programme', level: 'certificate' }), closed)
    assert.equal(unknown.ok, false)
    if (!unknown.ok) assert.equal(unknown.errors.programmeId, 'Choose a programme from the 2027 prospectus.')
  })
})

describe('explicit qualification openings', () => {
  it('accepts only the distinct qualifications named in the opening', () => {
    const masters = validateApplication(application(), approvedSample)
    assert.equal(masters.ok, true)
    if (masters.ok) {
      assert.equal(masters.value.programmeName, 'Theology')
      assert.equal(masters.value.level, 'masters_rpl')
      assert.equal(masters.value.levelLabel, 'Masters (via RPL)')
      assert.equal(masters.value.country, 'South Africa')
      assert.equal(masters.value.popiaConsent, true)
    }

    const doctorate = validateApplication(application({ level: 'phd_rpl' }), approvedSample)
    assert.equal(doctorate.ok, true)
    if (doctorate.ok) assert.equal(doctorate.value.levelLabel, 'PhD (via RPL)')

    const chaplaincy = validateApplication(application({
      programmeId: 'chaplaincy',
      level: 'certificate',
    }), approvedSample)
    assert.equal(chaplaincy.ok, true)
    if (chaplaincy.ok) assert.equal(chaplaincy.value.levelLabel, 'Certificate')

    const counselling = validateApplication(application({
      programmeId: 'christian-counselling',
      level: 'diploma',
    }), approvedSample)
    assert.equal(counselling.ok, true)
    if (counselling.ok) assert.equal(counselling.value.levelLabel, 'Diploma')

    const climate = validateApplication(application({
      programmeId: 'certificate-in-climate-change',
      level: 'certificate',
    }), approvedSample)
    assert.equal(climate.ok, true)
  })

  it('rejects a sibling qualification, including crafted requests', () => {
    for (const level of ['certificate', 'diploma', 'advanced_diploma'] as const) {
      const result = validateApplication(application({ level }), approvedSample)
      assert.equal(result.ok, false)
      if (!result.ok) {
        assert.match(result.errors.level, /Theology can be applied for at Masters \(via RPL\), PhD \(via RPL\)/)
        assert.equal(result.errors.programmeId, undefined)
      }
    }

    const chaplaincyDiploma = validateApplication(application({
      programmeId: 'chaplaincy',
      level: 'diploma',
    }), approvedSample)
    assert.equal(chaplaincyDiploma.ok, false)
    if (!chaplaincyDiploma.ok) assert.match(chaplaincyDiploma.errors.level, /Certificate \(6 months\)/)

    const counsellingCertificate = validateApplication(application({
      programmeId: 'christian-counselling',
      level: 'certificate',
    }), approvedSample)
    assert.equal(counsellingCertificate.ok, false)

    const counsellingDoctorate = validateApplication(application({
      programmeId: 'christian-counselling',
      level: 'phd_rpl',
    }), approvedSample)
    assert.equal(counsellingDoctorate.ok, false)
    if (!counsellingDoctorate.ok) assert.match(counsellingDoctorate.errors.level, /Diploma \(1 year\)/)
  })

  it('does not let a misconfigured opening turn one qualification into another or into RPL', () => {
    const relabelled: readonly QualificationOpening[] = [
      { programmeId: 'christian-counselling', levels: ['certificate', 'diploma', 'advanced_diploma', 'masters_rpl', 'phd_rpl'] },
      { programmeId: 'certificate-in-climate-change', levels: ['diploma', 'advanced_diploma', 'masters_rpl'] },
    ]
    assert.deepEqual(openLevelIds('christian-counselling', relabelled), ['certificate', 'diploma', 'advanced_diploma'])
    assert.deepEqual(openLevelIds('certificate-in-climate-change', relabelled), [])

    const rplOnCounselling = validateApplication(application({
      programmeId: 'christian-counselling',
      level: 'masters_rpl',
    }), relabelled)
    assert.equal(rplOnCounselling.ok, false)

    const climateDiploma = validateApplication(application({
      programmeId: 'certificate-in-climate-change',
      level: 'diploma',
    }), relabelled)
    assert.equal(climateDiploma.ok, false)
    if (!climateDiploma.ok) assert.match(climateDiploma.errors.programmeId, new RegExp(APPLICATIONS_NOT_OPEN_LABEL))

    const counselling = findProgramme('christian-counselling')
    assert.ok(counselling)
    assert.equal(levelCanBeOpened(counselling.programme, 'masters_rpl'), false)
    assert.equal(levelCanBeOpened(counselling.programme, 'certificate'), true)
  })
})

describe('dropdown options and level reset', () => {
  it('labels a closed programme and offers no levels before a programme is chosen', () => {
    const option = programmeSelectOption(findProgramme('christian-counselling')!.programme, closed)
    assert.equal(option.disabled, true)
    assert.equal(option.label, `Christian Counselling — ${APPLICATIONS_NOT_OPEN_LABEL}`)
    assert.deepEqual(levelSelectOptions('', closed), [])
    assert.equal(applyHeroSubtitle('christian-counselling', closed), `Christian Counselling: ${APPLICATIONS_NOT_OPEN_LABEL}`)
    assert.match(applyHeroSubtitle(undefined, closed), /You do not need an account/)
  })

  it('lists only the open qualification and keeps the prospectus record separate', () => {
    const counselling = findProgramme('christian-counselling')!.programme
    assert.deepEqual(
      studyLevelsForProgramme(counselling).map(level => level.id),
      ['certificate', 'diploma', 'advanced_diploma'],
    )
    assert.deepEqual(
      levelSelectOptions('christian-counselling', approvedSample).map(level => level.label),
      ['Diploma (1 year)'],
    )
    assert.deepEqual(
      levelSelectOptions('chaplaincy', approvedSample).map(level => level.label),
      ['Certificate (6 months)'],
    )
    assert.deepEqual(
      levelSelectOptions('theology', approvedSample).map(level => level.label),
      ['Masters (via RPL)', 'PhD (via RPL)'],
    )
    assert.equal(programmeSelectOption(counselling, approvedSample).disabled, false)
    assert.equal(programmeSelectOption(counselling, approvedSample).label, 'Christian Counselling')
    assert.match(applyHeroSubtitle('theology', approvedSample), /Masters and PhD are available via Recognition of Prior Learning/)
    assert.doesNotMatch(applyHeroSubtitle('chaplaincy', approvedSample), /RPL/)
  })

  it('clears a stale level when the next programme does not accept it', () => {
    assert.equal(levelAfterProgrammeChange('diploma', 'chaplaincy', approvedSample), '')
    assert.equal(levelAfterProgrammeChange('masters_rpl', 'christian-counselling', approvedSample), '')
    assert.equal(levelAfterProgrammeChange('certificate', 'christian-counselling', approvedSample), '')
    assert.equal(levelAfterProgrammeChange('phd_rpl', '', approvedSample), '')
    assert.equal(levelAfterProgrammeChange('', 'theology', approvedSample), '')
  })

  it('keeps a level that the next programme still accepts', () => {
    const bothCertificates: readonly QualificationOpening[] = [
      { programmeId: 'chaplaincy', levels: ['certificate'] },
      { programmeId: 'certificate-in-climate-change', levels: ['certificate'] },
    ]
    assert.equal(
      levelAfterProgrammeChange('certificate', 'certificate-in-climate-change', bothCertificates),
      'certificate',
    )
    assert.equal(levelAfterProgrammeChange('masters_rpl', 'theology', approvedSample), 'masters_rpl')
  })

  it('handles a programme whose opening list is empty', () => {
    const closedCounselling: readonly QualificationOpening[] = [
      { programmeId: 'christian-counselling', levels: [] },
      { programmeId: 'theology', levels: ['phd_rpl'] },
    ]
    assert.deepEqual(levelSelectOptions('christian-counselling', closedCounselling), [])
    assert.equal(levelAfterProgrammeChange('phd_rpl', 'christian-counselling', closedCounselling), '')
    assert.equal(programmeSelectOption(findProgramme('christian-counselling')!.programme, closedCounselling).disabled, true)
  })
})

describe('existing RPL scope', () => {
  it('keeps Masters and PhD via RPL on Theology & Ministry only', () => {
    const theologyIds = [
      'theology',
      'biblical-studies',
      'missiology',
      'chaplaincy',
      'church-administration',
      'pastoral-care',
    ]
    for (const programme of programmes) {
      const offers = programmeOffersRpl(programme)
      assert.equal(offers, theologyIds.includes(programme.id))
      if (offers) {
        assert.equal(programme.levels.includes('masters_rpl'), true)
        assert.equal(programme.levels.includes('phd_rpl'), true)
      } else {
        assert.equal(programme.levels.includes('masters_rpl' as StudyLevelId), false)
        assert.equal(programme.levels.includes('phd_rpl' as StudyLevelId), false)
      }
    }
    assert.equal(programmeOffersRpl(findProgramme('christian-counselling')!.programme), false)
  })
})

describe('database gate', () => {
  const sql = readFileSync(new URL(`../../supabase/migrations/${APPLICATION_OPENINGS_MIGRATION}`, import.meta.url), 'utf8')

  it('is an unapplied approval prerequisite and inserts no openings', () => {
    const executable = sql.split('\n').filter(line => !line.trim().startsWith('--')).join('\n')
    assert.match(sql, /DO NOT APPLY/)
    assert.doesNotMatch(executable, /INSERT\s+INTO\s+(public\.)?prospectus_application_openings/i)
    assert.match(sql, /CREATE TRIGGER prospectus_applications_require_open_pair/)
    assert.match(sql, /prospectus_application_is_open\(programme_id, level\)/)
    assert.match(sql, new RegExp(APPLICATION_NOT_OPEN_DB_MESSAGE))
    assert.match(sql, /GRANT SELECT ON TABLE public\.prospectus_application_openings TO anon, authenticated/)
    assert.doesNotMatch(sql, /GRANT INSERT ON TABLE public\.prospectus_application_openings TO anon/)
  })

  it('locks the database eligibility check to the prospectus ceiling', () => {
    const sqlPairs: string[] = []
    const pairPattern = /\('([a-z0-9-]+)', '([a-z_]+)'\)/g
    let found = pairPattern.exec(sql)
    while (found) {
      sqlPairs.push(`${found[1]}|${found[2]}`)
      found = pairPattern.exec(sql)
    }
    sqlPairs.sort()
    const codePairs = eligibleOpeningPairs().map(pair => `${pair.programmeId}|${pair.level}`).sort()
    assert.deepEqual(sqlPairs, codePairs)
    assert.equal(sqlPairs.includes('christian-counselling|certificate'), true)
    assert.equal(sqlPairs.includes('christian-counselling|masters_rpl'), false)
    assert.equal(sqlPairs.includes('certificate-in-climate-change|certificate'), true)
    assert.equal(sqlPairs.includes('certificate-in-climate-change|diploma'), false)
  })

  it('uses queried rows as the only open qualifications', () => {
    const fromRows = rowsToOpenings([
      { programme_id: 'christian-counselling', level: 'diploma' },
      { programme_id: 'certificate-in-climate-change', level: 'diploma' },
      { programme_id: 'chaplaincy', level: 'certificate' },
    ])
    assert.deepEqual(fromRows, [
      { programmeId: 'christian-counselling', levels: ['diploma'] },
      { programmeId: 'chaplaincy', levels: ['certificate'] },
    ])
    assert.equal(validateApplication(application({
      programmeId: 'christian-counselling',
      level: 'diploma',
    }), fromRows).ok, true)
    assert.equal(validateApplication(application({
      programmeId: 'christian-counselling',
      level: 'certificate',
    }), fromRows).ok, false)
    assert.equal(validateApplication(application({
      programmeId: 'certificate-in-climate-change',
      level: 'diploma',
    }), fromRows).ok, false)
  })
})

describe('homepage availability copy', () => {
  it('does not claim every level is offered while nothing is open', () => {
    const summary = homepageAvailabilitySummary([])
    assert.match(summary.hero, /not yet open/i)
    assert.equal(summary.statValue, 'Not yet open')
    assert.doesNotMatch(summary.hero, /Certificate, Diploma and Advanced Diploma programmes/)
    assert.doesNotMatch(`${summary.hero} ${summary.statValue} ${summary.statLabel}`, /Up to PhD/)
  })

  it('names only the qualifications present in the openings', () => {
    const summary = homepageAvailabilitySummary(approvedSample)
    assert.match(summary.hero, /Theology \(Masters \(via RPL\), PhD \(via RPL\)\)/)
    assert.match(summary.hero, /Chaplaincy \(Certificate \(6 months\)\)/)
    assert.match(summary.hero, /Christian Counselling \(Diploma \(1 year\)\)/)
    assert.match(summary.hero, /Certificate in Climate Change \(Certificate \(6 months\)\)/)
    assert.doesNotMatch(summary.hero, /Business Administration/)
    assert.doesNotMatch(summary.hero, /Christian Counselling \(Certificate/)
    assert.doesNotMatch(summary.hero, /Chaplaincy \(Diploma/)
  })
})
