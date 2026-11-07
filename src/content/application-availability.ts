import {
  findProgramme,
  programmeOffersRpl,
  prospectusSchools,
  studyLevelById,
  studyLevelChoiceLabel,
  studyLevels,
  type ProspectusProgramme,
  type StudyLevelId,
} from './prospectus'

/** Exact public label for a programme that cannot be applied for. */
export const APPLICATIONS_NOT_OPEN_LABEL = 'Under development — applications not yet open.'

export type QualificationOpening = {
  programmeId: string
  /**
   * Distinct qualifications that accept a public application.
   * Empty means the programme is not open. This is not a rename of one course.
   */
  levels: readonly StudyLevelId[]
}

/**
 * Migration that creates the openings table and rejects unavailable inserts.
 * It is not applied from this pull request. It inserts no rows.
 */
export const APPLICATION_OPENINGS_MIGRATION = '00033_prospectus_application_openings.sql'

export const APPLICATION_NOT_OPEN_DB_MESSAGE = 'applications are not open for this programme and qualification'

const RPL_LEVELS = new Set<StudyLevelId>(['masters_rpl', 'phd_rpl'])
const STANDARD_LEVELS = new Set<StudyLevelId>(['certificate', 'diploma', 'advanced_diploma'])

function configuredLevelIds(
  programmeId: string,
  openings: readonly QualificationOpening[],
): StudyLevelId[] {
  const match = openings.find(item => item.programmeId === programmeId)
  const seen = new Set<StudyLevelId>()
  const levels: StudyLevelId[] = []
  for (const levelId of match?.levels ?? []) {
    if (seen.has(levelId)) continue
    seen.add(levelId)
    levels.push(levelId)
  }
  return levels
}

/** A listed qualification may be opened only when the prospectus record already names it. */
export function levelCanBeOpened(programme: ProspectusProgramme, levelId: StudyLevelId): boolean {
  if (!programme.levels.includes(levelId) || !studyLevelById(levelId)) return false
  if (RPL_LEVELS.has(levelId)) return programmeOffersRpl(programme)
  return STANDARD_LEVELS.has(levelId)
}

/**
 * Pairs the prospectus record allows someone to approve later.
 * This is not the list of open applications. The database table is that list,
 * and migration 00033 must name exactly these pairs in its eligibility check.
 */
export function eligibleOpeningPairs(): { programmeId: string; level: StudyLevelId }[] {
  const pairs: { programmeId: string; level: StudyLevelId }[] = []
  for (const school of prospectusSchools) {
    for (const programme of school.programmes) {
      for (const level of studyLevels) {
        if (levelCanBeOpened(programme, level.id)) pairs.push({ programmeId: programme.id, level: level.id })
      }
    }
  }
  return pairs
}

export type ApplicationAvailability = {
  openings: QualificationOpening[]
  /** True only when the openings table could be read. An empty table is enforced and still closed. */
  databaseEnforced: boolean
}

export function rowsToOpenings(
  rows: readonly { programme_id: string; level: string }[],
): QualificationOpening[] {
  const byProgramme = new Map<string, StudyLevelId[]>()
  for (const row of rows) {
    const match = findProgramme(row.programme_id)
    const levelId = studyLevelById(row.level)?.id
    if (!match || !levelId || !levelCanBeOpened(match.programme, levelId)) continue
    const levels = byProgramme.get(row.programme_id) ?? []
    if (!levels.includes(levelId)) levels.push(levelId)
    byProgramme.set(row.programme_id, levels)
  }
  const openings: QualificationOpening[] = []
  byProgramme.forEach((levels, programmeId) => {
    openings.push({ programmeId, levels })
  })
  return openings
}

/** A query error fails closed and reports that the database gate is not in place. */
export function availabilityFromQuery(
  error: { code?: string; message?: string } | null,
  rows: readonly { programme_id: string; level: string }[] | null,
): ApplicationAvailability {
  if (error || !rows) return { openings: [], databaseEnforced: false }
  return { openings: rowsToOpenings(rows), databaseEnforced: true }
}

export function applicationInsertRejectedAsClosed(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  return error.code === '42501' || (error.message ?? '').includes(APPLICATION_NOT_OPEN_DB_MESSAGE)
}

/** Qualifications that accept applications for this programme, in prospectus order. */
export function openLevelIds(
  programmeId: string,
  openings: readonly QualificationOpening[],
): StudyLevelId[] {
  const match = findProgramme(programmeId)
  if (!match) return []
  const allowed = new Set(
    configuredLevelIds(programmeId, openings).filter(levelId => levelCanBeOpened(match.programme, levelId)),
  )
  return studyLevels.map(level => level.id).filter(levelId => allowed.has(levelId))
}

export function programmeAcceptsApplications(
  programmeId: string,
  openings: readonly QualificationOpening[],
): boolean {
  return openLevelIds(programmeId, openings).length > 0
}

export function programmeSelectOption(
  programme: ProspectusProgramme,
  openings: readonly QualificationOpening[],
): { value: string; label: string; disabled: boolean } {
  const name = `${programme.name}${programme.isNew ? ' (New)' : ''}`
  const disabled = !programmeAcceptsApplications(programme.id, openings)
  return {
    value: programme.id,
    disabled,
    label: disabled ? `${name} — ${APPLICATIONS_NOT_OPEN_LABEL}` : name,
  }
}

export function levelSelectOptions(
  programmeId: string,
  openings: readonly QualificationOpening[],
) {
  return openLevelIds(programmeId, openings).flatMap(levelId => {
    const level = studyLevelById(levelId)
    return level ? [{ id: level.id, label: studyLevelChoiceLabel(level), admission: level.admission }] : []
  })
}

/** Drop a level the newly selected programme does not accept. Keep a level it still accepts. */
export function levelAfterProgrammeChange(
  currentLevel: string,
  nextProgrammeId: string,
  openings: readonly QualificationOpening[],
): StudyLevelId | '' {
  if (!currentLevel) return ''
  const open = openLevelIds(nextProgrammeId, openings)
  return open.includes(currentLevel as StudyLevelId) ? currentLevel as StudyLevelId : ''
}

export function applyHeroSubtitle(
  programmeId: string | null | undefined,
  openings: readonly QualificationOpening[],
): string {
  const match = programmeId ? findProgramme(programmeId) : null
  if (!match) return 'Submit a prospectus application. You do not need an account.'
  const open = openLevelIds(match.programme.id, openings)
  if (open.length === 0) return `${match.programme.name}: ${APPLICATIONS_NOT_OPEN_LABEL}`
  const rplOpen = open.some(levelId => RPL_LEVELS.has(levelId))
  if (rplOpen) {
    return `Apply for ${match.programme.name}. Masters and PhD are available via Recognition of Prior Learning (RPL). You do not need an account.`
  }
  return `Apply for ${match.programme.name}. You do not need an account.`
}

export function applicationAvailabilityRows(
  openings: readonly QualificationOpening[],
) {
  return prospectusSchools.flatMap(school => school.programmes.map(programme => {
    const open = levelSelectOptions(programme.id, openings)
    return {
      schoolName: school.name,
      programmeId: programme.id,
      programmeName: programme.name,
      closed: open.length === 0,
      qualifications: open.map(level => level.label),
    }
  }))
}

export function homepageAvailabilitySummary(openings: readonly QualificationOpening[]) {
  const openRows = applicationAvailabilityRows(openings).filter(row => !row.closed)
  if (openRows.length === 0) {
    return {
      hero: 'Prospectus programmes are grouped in five schools. Applications are not yet open for any qualification. A qualification can be applied for only after that distinct qualification is approved. Full-time, part-time, evening, and online distance learning are the study modes where a qualification is open.',
      statValue: 'Not yet open',
      statLabel: 'Applications for prospectus qualifications',
      ctaTitle: 'Applications are not yet open',
      ctaDescription: 'The application form lists prospectus programmes. A qualification that is not open is labelled and cannot be submitted.',
      ctaLabel: 'View the application form',
    }
  }
  const listed = openRows.map(row => `${row.programmeName} (${row.qualifications.join(', ')})`).join('; ')
  return {
    hero: `Applications are open for ${listed}. Every other prospectus qualification is under development and cannot be applied for. Full-time, part-time, evening, and online distance learning are the study modes where a qualification is open.`,
    statValue: String(openRows.length),
    statLabel: openRows.length === 1 ? 'Programme with an open qualification' : 'Programmes with an open qualification',
    ctaTitle: 'Apply for an open qualification',
    ctaDescription: 'The application form lists only the qualifications that are open. You do not need an account.',
    ctaLabel: 'Apply for an open qualification',
  }
}
