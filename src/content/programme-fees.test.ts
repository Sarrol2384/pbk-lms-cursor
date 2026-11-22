import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { formatUsd } from '../lib/tuition.ts'
import {
  ACADEMIC_LADDER,
  CERTIFICATE_ONLY_PROGRAMME_ID,
  PROGRAMME_FEE_SCHEDULE,
  PROGRESSION_NOTES,
  CHAPLAINCY_FEES,
  CHAPLAINCY_PATH,
  INSTALMENT_TERMS,
  RPL_REGISTRATION_USD,
  STANDARD_REGISTRATION_USD,
  STUDY_LEVEL_IDS,
  STUDY_PATHWAY_INTRO,
  THEOLOGY_LADDER,
  THEOLOGY_SCHOOL_ID,
  choiceLabel,
  entryRequirement,
  isRplLevel,
  levelsForProgramme,
  pathwayFacts,
  registrationSentence,
  scheduleRow,
  type FeeScheduleRow,
  type StudyLevelId,
} from './programme-fees.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const approved: Record<'academic' | 'theology', Record<StudyLevelId, { tuitionUsd: number; duration: string }>> = {
  academic: {
    certificate: { tuitionUsd: 500, duration: '6-12 months' },
    advanced_certificate: { tuitionUsd: 800, duration: '1 year' },
    diploma: { tuitionUsd: 1800, duration: '2 years' },
    advanced_diploma: { tuitionUsd: 2800, duration: '3 years' },
    bachelors: { tuitionUsd: 6000, duration: '3-4 years' },
    masters_rpl: { tuitionUsd: 2500, duration: '1-1.5 years' },
    phd_rpl: { tuitionUsd: 5000, duration: '2-3 years' },
  },
  theology: {
    certificate: { tuitionUsd: 150, duration: '6 months' },
    advanced_certificate: { tuitionUsd: 300, duration: '1 year' },
    diploma: { tuitionUsd: 600, duration: '2 years' },
    advanced_diploma: { tuitionUsd: 1000, duration: '3 years' },
    bachelors: { tuitionUsd: 1800, duration: '3-4 years' },
    masters_rpl: { tuitionUsd: 1200, duration: '1 year' },
    phd_rpl: { tuitionUsd: 2500, duration: '2-3 years' },
  },
}

function historicalSqlTuple(row: FeeScheduleRow): string {
  const registration = isRplLevel(row.level) ? '100' : 'NULL'
  const offered = row.offeredOnProspectus ? 'true' : 'false'
  const name = row.name.replaceAll("'", "''")
  return `('${row.track}', '${row.level}', '${name}', ${row.tuitionUsd}, '${row.duration}', ${registration}, ${offered})`
}

describe('approved USD totals', () => {
  it('stores every academic and theology total and duration', () => {
    assert.equal(PROGRAMME_FEE_SCHEDULE.length, 14)
    for (const track of ['academic', 'theology'] as const) {
      for (const level of STUDY_LEVEL_IDS) {
        const row = scheduleRow(track, level)
        assert.equal(row.tuitionUsd, approved[track][level].tuitionUsd)
        assert.equal(row.duration, approved[track][level].duration)
        assert.equal(row.tuitionUsd, Math.round(row.tuitionUsd))
      }
    }
  })

  it('uses the theology names from the approved list, including the new bachelor level', () => {
    assert.equal(scheduleRow('theology', 'certificate').name, 'Certificate in Theology/Ministry')
    assert.equal(scheduleRow('theology', 'advanced_certificate').name, 'Advanced Certificate in Theology')
    assert.equal(scheduleRow('theology', 'diploma').name, 'Diploma in Theology/Divinity')
    assert.equal(scheduleRow('theology', 'advanced_diploma').name, 'Advanced Diploma in Theology')
    assert.equal(scheduleRow('theology', 'bachelors').name, "Bachelor's in Theology/Biblical Studies")
    assert.equal(scheduleRow('theology', 'masters_rpl').name, "Master's in Theology (RPL)")
    assert.equal(scheduleRow('theology', 'phd_rpl').name, 'PhD in Theology (RPL)')
  })

  it('charges 25 for standard registration on both tracks and 100 for RPL only', () => {
    assert.equal(STANDARD_REGISTRATION_USD, 25)
    assert.equal(RPL_REGISTRATION_USD, 100)
    for (const row of PROGRAMME_FEE_SCHEDULE) {
      if (isRplLevel(row.level)) assert.equal(row.registrationUsd, 100)
      else assert.equal(row.registrationUsd, 25)
    }
    assert.equal(registrationSentence('certificate', formatUsd), 'Registration is $25.')
    assert.equal(registrationSentence('bachelors', formatUsd), 'Registration is $25.')
    assert.equal(registrationSentence('masters_rpl', formatUsd), 'Registration is $100.')
    assert.equal(registrationSentence('phd_rpl', formatUsd), 'Registration is $100.')
    assert.equal(INSTALMENT_TERMS, 'A deposit of 30% to 50% of the total fee, then monthly instalments for the balance.')
  })

  it('shows full USD prices, with no tax wording', () => {
    assert.equal(choiceLabel("Bachelor's", 'theology', 'bachelors', formatUsd), "Bachelor's (3-4 years) — $1,800")
    assert.equal(choiceLabel("Bachelor's", 'academic', 'bachelors', formatUsd), "Bachelor's (3-4 years) — $6,000")
    assert.equal(choiceLabel('Certificate', 'theology', 'certificate', formatUsd), 'Certificate (6 months) — $150')
    const published = [
      STUDY_PATHWAY_INTRO.title,
      STUDY_PATHWAY_INTRO.body,
      ...PROGRESSION_NOTES,
      ...PROGRAMME_FEE_SCHEDULE.map(row => `${row.name} ${row.duration}`),
      ...pathwayFacts('academic').flatMap(row => [row.entryRequirement, row.nextStep]),
      ...pathwayFacts('theology').flatMap(row => [row.entryRequirement, row.nextStep]),
    ].join('\n')
    assert.match(published, /globally accredited/)
    assert.doesNotMatch(published, /VAT|NQF-aligned|SAQA accredited|aligned with SAQA|NQF Level/i)
  })
})

describe('who can be offered which level', () => {
  it('adds bachelor and advanced certificate to theology, and keeps RPL off the lower levels', () => {
    assert.deepEqual(levelsForProgramme(THEOLOGY_SCHOOL_ID, 'theology'), THEOLOGY_LADDER)
    assert.deepEqual(levelsForProgramme(THEOLOGY_SCHOOL_ID, 'biblical-studies'), THEOLOGY_LADDER)
    assert.ok(THEOLOGY_LADDER.includes('bachelors'))
    assert.ok(THEOLOGY_LADDER.includes('advanced_certificate'))
    assert.equal(isRplLevel('certificate'), false)
    assert.equal(isRplLevel('advanced_certificate'), false)
    assert.equal(isRplLevel('diploma'), false)
    assert.equal(isRplLevel('advanced_diploma'), false)
    assert.equal(isRplLevel('bachelors'), false)
    assert.equal(isRplLevel('masters_rpl'), true)
    assert.equal(isRplLevel('phd_rpl'), true)
  })

  it('does not list academic master or PhD on academic programmes, and keeps climate at certificate', () => {
    assert.deepEqual(levelsForProgramme('business-leadership-entrepreneurship', 'business-administration'), ACADEMIC_LADDER)
    assert.equal(ACADEMIC_LADDER.includes('masters_rpl'), false)
    assert.equal(ACADEMIC_LADDER.includes('phd_rpl'), false)
    assert.equal(scheduleRow('academic', 'masters_rpl').offeredOnProspectus, false)
    assert.equal(scheduleRow('academic', 'phd_rpl').offeredOnProspectus, false)
    assert.equal(scheduleRow('theology', 'bachelors').offeredOnProspectus, true)
    assert.deepEqual(levelsForProgramme('environment-community-development', CERTIFICATE_ONLY_PROGRAMME_ID), ['certificate'])
  })

  it('does not describe RPL as the route into certificate through bachelor', () => {
    for (const level of ACADEMIC_LADDER) {
      assert.equal(entryRequirement('academic', level), entryRequirement('theology', level))
      assert.doesNotMatch(entryRequirement('theology', level), /RPL/)
    }
    const theologyBachelor = pathwayFacts('theology').find(row => row.level === 'bachelors')
    assert.equal(theologyBachelor?.nextStep, "Master's (RPL), on a Theology & Ministry programme")
    assert.match(pathwayFacts('theology').find(row => row.level === 'certificate')?.nextStep ?? '', /Advanced Certificate/)
    assert.match(PROGRESSION_NOTES.join(' '), /not used for Certificate, Advanced Certificate, Diploma, Advanced Diploma, or Bachelor's/)
  })
})

describe('reviewed SQL', () => {
  const sqlPath = join(root, 'supabase/migrations/00034_programme_fee_schedule.sql')
  const sql = readFileSync(sqlPath, 'utf8')

  it('is 00034 because 00033 is already used on PR 16', () => {
    const names = readdirSync(join(root, 'supabase/migrations'))
    assert.equal(names.includes('00034_programme_fee_schedule.sql'), true)
    assert.equal(names.some(name => name.startsWith('00033')), false)
    assert.match(sql, /00033_prospectus_application_openings\.sql/)
    assert.match(sql, /DO NOT APPLY/)
    assert.match(sql, /standard registration amount is not approved|Do not invent/)
  })

  it('inserts the same totals and does not update course fees', () => {
    for (const row of PROGRAMME_FEE_SCHEDULE) {
      const tuple = historicalSqlTuple(row)
      assert.equal(sql.split(tuple).length - 1, 1, tuple)
    }
    assert.match(sql, /INSERT INTO public\.registration_fee_config \(id, amount_usd, note\)\s*VALUES \(\s*'standard',\s*NULL,/)
    const executable = sql.replace(/--.*$/gm, '')
    assert.doesNotMatch(executable, /\bUPDATE\b/i)
    assert.doesNotMatch(sql, /VAT/i)
    for (const level of STUDY_LEVEL_IDS) {
      assert.match(sql, new RegExp(`'${level}'`))
    }
  })
})

describe('standard registration follow-up', () => {
  const sql = readFileSync(join(root, 'supabase/migrations/00037_standard_registration_usd.sql'), 'utf8')

  it('sets 25 for non-RPL registration and leaves RPL at 100, without being applied here', () => {
    assert.match(sql, /NOT APPLIED/)
    assert.match(sql, /Do not run/)
    assert.match(sql, /ownoxqbsdmhacalegsmr/)
    assert.match(sql, /amount_usd = 25/)
    assert.match(sql, /registration_usd = 25/)
    assert.match(sql, /level NOT IN \('masters_rpl', 'phd_rpl'\)/)
    assert.match(sql, /registration_usd IS DISTINCT FROM 100/)
    assert.doesNotMatch(sql.replace(/--.*$/gm, ''), /UPDATE\s+public\.courses/i)
    assert.doesNotMatch(sql, /VAT/i)
    assert.match(sql, /Chaplaincy certification fees are not stored here/)
    assert.doesNotMatch(sql, /designated|professional chaplain/i)
  })
})

describe('chaplaincy certification fees', () => {
  it('keeps one source for registration, ACBC membership, and the three levels', () => {
    assert.equal(CHAPLAINCY_PATH, '/chaplaincy')
    assert.equal(CHAPLAINCY_FEES.registrationUsd, 50)
    assert.equal(CHAPLAINCY_FEES.acbcMembershipUsd, 50)
    assert.deepEqual(
      CHAPLAINCY_FEES.levels.map(level => [level.id, level.feeUsd, level.entryRequirement, level.duration]),
      [
        ['designated', 80, 'Grade 12 (NQF 4) or higher', '1 month'],
        ['certified', 150, 'Any theological diploma', '6 months'],
        ['professional', 250, 'A degree', '1 year or more'],
      ],
    )
  })

  it('does not call the pathway SAQA accredited', () => {
    const page = readFileSync(join(root, 'src/app/(marketing)/chaplaincy/page.tsx'), 'utf8')
    assert.match(page, /globally accredited/)
    assert.match(page, /CHAPLAINCY_FEES/)
    assert.doesNotMatch(page, /SAQA accredited|NQF-aligned|VAT/i)
    assert.match(page, /href="\/contact"/)
    assert.match(page, /mailto:/)
  })
})

describe('BBA fee statement', () => {
  const sql = readFileSync(join(root, 'supabase/migrations/00035_bba_fee_and_title.sql'), 'utf8')

  it('guards a single exact title and sets the academic bachelor total', () => {
    assert.match(sql, /DO NOT APPLY this file to production/)
    assert.match(sql, /'Bachelor of Business Administration \(SAQA 118402\)'/)
    assert.match(sql, /title = 'Bachelor of Business Administration'/)
    assert.match(sql, /fee = 6000/)
    assert.match(sql, /match_count <> 1/)
    assert.match(sql, /updated_count <> 1/)
    assert.match(sql, /Production project ownoxqbsdmhacalegsmr is not a target/)
    assert.doesNotMatch(sql.replace(/--.*$/gm, ''), /\bVAT\b/i)
  })
})

describe('public catalogue still matches the ladders', () => {
  const prospectus = readFileSync(join(root, 'src/content/prospectus.ts'), 'utf8')

  it('assigns the theology ladder, the academic ladder, and certificate-only climate', () => {
    const assigns = [...prospectus.matchAll(/^\s*levels: (academicLadder,|theologyLevels,|\['certificate'\],)$/gm)].map(match => match[1])
    assert.equal(assigns.length, 18)
    assert.equal(assigns.filter(item => item === 'academicLadder,').length, 11)
    assert.equal(assigns.filter(item => item === 'theologyLevels,').length, 6)
    assert.equal(assigns.filter(item => item === "['certificate'],").length, 1)
    for (const id of ['theology', 'biblical-studies', 'missiology', 'chaplaincy', 'church-administration', 'pastoral-care']) {
      assert.match(prospectus, new RegExp(`id: '${id}'[\\s\\S]*?levels: theologyLevels`))
    }
    assert.match(prospectus, /id: 'certificate-in-climate-change'[\s\S]*?levels: \['certificate'\]/)
    assert.equal(existsSync(join(root, 'src/components/marketing/NqfPathwayTable.tsx')), false)
  })

  it('does not publish an NQF or SAQA accreditation claim from the pages that show fees', () => {
    const pages = [
      'src/content/marketing.ts',
      'src/app/(marketing)/education/page.tsx',
      'src/app/(marketing)/page.tsx',
      'src/components/marketing/Prospectus.tsx',
      'src/components/marketing/FeeSchedule.tsx',
      'src/components/marketing/StudyPathwayTable.tsx',
      'src/components/marketing/PublicApplicationForm.tsx',
      'src/app/(marketing)/chaplaincy/page.tsx',
    ]
    for (const page of pages) {
      const text = readFileSync(join(root, page), 'utf8')
      assert.doesNotMatch(text, /NQF-aligned|SAQA accredited|aligned with SAQA|NQF Levels|NQF Level/i, page)
    }
  })
})
