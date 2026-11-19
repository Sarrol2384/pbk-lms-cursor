import {
  ACADEMIC_LADDER,
  LEVEL_LABEL,
  THEOLOGY_LADDER,
  choiceLabel,
  entryRequirement,
  type FeeTrack,
  type StudyLevelId,
} from '@/content/programme-fees'
import { formatUsd } from '@/lib/tuition'

export const PROSPECTUS_YEAR = 2027

export type { StudyLevelId }

export const studyLevels = [
  {
    id: 'certificate',
    label: LEVEL_LABEL.certificate,
    admission: entryRequirement('academic', 'certificate'),
  },
  {
    id: 'advanced_certificate',
    label: LEVEL_LABEL.advanced_certificate,
    admission: entryRequirement('academic', 'advanced_certificate'),
  },
  {
    id: 'diploma',
    label: LEVEL_LABEL.diploma,
    admission: entryRequirement('academic', 'diploma'),
  },
  {
    id: 'advanced_diploma',
    label: LEVEL_LABEL.advanced_diploma,
    admission: entryRequirement('academic', 'advanced_diploma'),
  },
  {
    id: 'bachelors',
    label: LEVEL_LABEL.bachelors,
    admission: entryRequirement('academic', 'bachelors'),
  },
  {
    id: 'masters_rpl',
    label: LEVEL_LABEL.masters_rpl,
    admission: entryRequirement('theology', 'masters_rpl'),
  },
  {
    id: 'phd_rpl',
    label: LEVEL_LABEL.phd_rpl,
    admission: entryRequirement('theology', 'phd_rpl'),
  },
] as const satisfies readonly { id: StudyLevelId; label: string; admission: string }[]

export const studyModes = [
  { id: 'full_time', label: 'Full-time' },
  { id: 'part_time', label: 'Part-time' },
  { id: 'evening', label: 'Evening' },
  { id: 'online', label: 'Online distance learning' },
] as const

export type StudyModeId = (typeof studyModes)[number]['id']

export const highestQualifications = [
  'Grade 9',
  'Grade 12 / National Senior Certificate',
  'Certificate',
  'Diploma',
  'Advanced Diploma',
  'Degree or higher',
  'Other',
] as const

const academicLadder: readonly StudyLevelId[] = ACADEMIC_LADDER

/** Theology & Ministry, including Bachelor's and Master's and PhD via RPL. */
const theologyLevels: readonly StudyLevelId[] = THEOLOGY_LADDER

export type ProspectusProgramme = {
  id: string
  name: string
  summary: string
  levels: readonly StudyLevelId[]
  /** Shown on the prospectus. Only the new climate programme uses this. */
  isNew?: boolean
}

export type ProspectusSchool = {
  id: string
  name: string
  programmes: ProspectusProgramme[]
}

export const prospectusSchools: ProspectusSchool[] = [
  {
    id: 'business-leadership-entrepreneurship',
    name: 'Business, Leadership & Entrepreneurship',
    programmes: [
      {
        id: 'business-administration',
        name: 'Business Administration',
        summary: 'Business operations, finance, marketing and strategic planning.',
        levels: academicLadder,
      },
      {
        id: 'business-management',
        name: 'Business Management',
        summary: 'Managerial skills for effective supervision and corporate leadership.',
        levels: academicLadder,
      },
      {
        id: 'entrepreneurship',
        name: 'Entrepreneurship',
        summary: 'Starting, managing and scaling sustainable businesses and ministries.',
        levels: academicLadder,
      },
      {
        id: 'organisational-leadership',
        name: 'Organisational Leadership',
        summary: 'Transformational leadership, decision-making and team-building.',
        levels: academicLadder,
      },
      {
        id: 'public-administration',
        name: 'Public Administration',
        summary: 'Governance, public policy and service in government and NGOs.',
        levels: academicLadder,
      },
    ],
  },
  {
    id: 'theology-ministry',
    name: 'Theology & Ministry',
    programmes: [
      {
        id: 'theology',
        name: 'Theology',
        summary: 'Christian doctrines, church history and systematic theology.',
        levels: theologyLevels,
      },
      {
        id: 'biblical-studies',
        name: 'Biblical Studies',
        summary: 'Old and New Testament, exegesis and biblical interpretation.',
        levels: theologyLevels,
      },
      {
        id: 'missiology',
        name: 'Missiology',
        summary: 'World missions, cross-cultural evangelism and church planting.',
        levels: theologyLevels,
      },
      {
        id: 'chaplaincy',
        name: 'Chaplaincy',
        summary: 'Training for chaplains in hospitals, prisons, military, schools.',
        levels: theologyLevels,
      },
      {
        id: 'church-administration',
        name: 'Church Administration',
        summary: 'Management, governance and stewardship in the church.',
        levels: theologyLevels,
      },
      {
        id: 'pastoral-care',
        name: 'Pastoral Care',
        summary: 'Shepherding, visitation and spiritual formation.',
        levels: theologyLevels,
      },
    ],
  },
  {
    id: 'counselling-psychology-social-studies',
    name: 'Counselling, Psychology & Social Studies',
    programmes: [
      {
        id: 'christian-counselling',
        name: 'Christian Counselling',
        summary: 'Biblical counselling for individuals, families and marriages.',
        levels: academicLadder,
      },
      {
        id: 'christian-psychology',
        name: 'Christian Psychology',
        summary: 'Integration of psychology and Christian faith.',
        levels: academicLadder,
      },
      {
        id: 'conflict-management',
        name: 'Conflict Management',
        summary: 'Mediation, peace-building and conflict resolution.',
        levels: academicLadder,
      },
      {
        id: 'risk-management',
        name: 'Risk Management',
        summary: 'Identifying, assessing and mitigating organisational risks.',
        levels: academicLadder,
      },
    ],
  },
  {
    id: 'security-technology-safety',
    name: 'Security, Technology & Safety',
    programmes: [
      {
        id: 'safety-and-security-management',
        name: 'Safety and Security Management',
        summary: 'Security operations and safety protocols.',
        levels: academicLadder,
      },
      {
        id: 'it-cybersecurity',
        name: 'IT / Cybersecurity',
        summary: 'IT fundamentals, networks and cyber threat protection.',
        levels: academicLadder,
      },
    ],
  },
  {
    id: 'environment-community-development',
    name: 'Environment & Community Development',
    programmes: [
      {
        id: 'certificate-in-climate-change',
        name: 'Certificate in Climate Change',
        summary:
          'Climate change science, environmental stewardship from a Biblical perspective, climate justice, disaster risk reduction, adaptation strategies, and sustainable community development.',
        levels: ['certificate'],
        isNew: true,
      },
    ],
  },
]

export function findProgramme(programmeId: string): { school: ProspectusSchool; programme: ProspectusProgramme } | null {
  for (const school of prospectusSchools) {
    const programme = school.programmes.find(item => item.id === programmeId)
    if (programme) return { school, programme }
  }
  return null
}

export function studyLevelById(id: string) {
  return studyLevels.find(level => level.id === id) ?? null
}

/** Dropdown text: level, duration for that programme's track, and the full USD total. */
export function studyLevelChoiceLabel(level: (typeof studyLevels)[number], track: FeeTrack): string {
  return choiceLabel(level.label, track, level.id, formatUsd)
}

export function programmeOffersRpl(programme: ProspectusProgramme): boolean {
  return programme.levels.includes('masters_rpl') || programme.levels.includes('phd_rpl')
}

/** Levels offered for the selected programme. Before a programme is chosen, the academic ladder is listed. RPL is not on that ladder. */
export function studyLevelsForProgramme(programme: ProspectusProgramme | null) {
  const offered = programme ? programme.levels : academicLadder
  return studyLevels.filter(level => (offered as readonly StudyLevelId[]).includes(level.id))
}

export function studyModeById(id: string) {
  return studyModes.find(mode => mode.id === id) ?? null
}

export function programmeCount(): number {
  return prospectusSchools.reduce((sum, school) => sum + school.programmes.length, 0)
}
