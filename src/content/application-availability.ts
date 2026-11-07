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
 * Application gate for /apply.
 *
 * This list is not the prospectus `levels` text and not `courses.status`.
 * Published enrolment content does not open applications.
 * The committed list is empty: this repository has no approved qualification
 * to accept. Add a programme only after that distinct qualification is approved.
 */
export const applicationOpenings: readonly QualificationOpening[] = []

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

/** Qualifications that accept applications for this programme, in prospectus order. */
export function openLevelIds(
  programmeId: string,
  openings: readonly QualificationOpening[] = applicationOpenings,
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
  openings: readonly QualificationOpening[] = applicationOpenings,
): boolean {
  return openLevelIds(programmeId, openings).length > 0
}

export function programmeSelectOption(
  programme: ProspectusProgramme,
  openings: readonly QualificationOpening[] = applicationOpenings,
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
  openings: readonly QualificationOpening[] = applicationOpenings,
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
  openings: readonly QualificationOpening[] = applicationOpenings,
): StudyLevelId | '' {
  if (!currentLevel) return ''
  const open = openLevelIds(nextProgrammeId, openings)
  return open.includes(currentLevel as StudyLevelId) ? currentLevel as StudyLevelId : ''
}

export function applyHeroSubtitle(
  programmeId: string | null | undefined,
  openings: readonly QualificationOpening[] = applicationOpenings,
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
  openings: readonly QualificationOpening[] = applicationOpenings,
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
