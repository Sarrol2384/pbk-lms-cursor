export const PROSPECTUS_YEAR = 2027

export const studyLevels = [
  {
    id: 'certificate',
    label: 'Certificate',
    duration: '6 months',
    admission: 'Grade 9 or Grade 12. Open to anyone with an interest in the field.',
  },
  {
    id: 'diploma',
    label: 'Diploma',
    duration: '1 year',
    admission: 'A Grade 12 certificate, plus a certificate in a relevant field.',
  },
  {
    id: 'advanced_diploma',
    label: 'Advanced Diploma',
    duration: '2 years',
    admission: 'A diploma in a relevant field.',
  },
] as const

export type StudyLevelId = (typeof studyLevels)[number]['id']

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

const allLevels: StudyLevelId[] = ['certificate', 'diploma', 'advanced_diploma']

export type ProspectusProgramme = {
  id: string
  name: string
  summary: string
  levels: StudyLevelId[]
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
        levels: allLevels,
      },
      {
        id: 'business-management',
        name: 'Business Management',
        summary: 'Managerial skills for effective supervision and corporate leadership.',
        levels: allLevels,
      },
      {
        id: 'entrepreneurship',
        name: 'Entrepreneurship',
        summary: 'Starting, managing and scaling sustainable businesses and ministries.',
        levels: allLevels,
      },
      {
        id: 'organisational-leadership',
        name: 'Organisational Leadership',
        summary: 'Transformational leadership, decision-making and team-building.',
        levels: allLevels,
      },
      {
        id: 'public-administration',
        name: 'Public Administration',
        summary: 'Governance, public policy and service in government and NGOs.',
        levels: allLevels,
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
        levels: allLevels,
      },
      {
        id: 'biblical-studies',
        name: 'Biblical Studies',
        summary: 'Old and New Testament, exegesis and biblical interpretation.',
        levels: allLevels,
      },
      {
        id: 'missiology',
        name: 'Missiology',
        summary: 'World missions, cross-cultural evangelism and church planting.',
        levels: allLevels,
      },
      {
        id: 'chaplaincy',
        name: 'Chaplaincy',
        summary: 'Training for chaplains in hospitals, prisons, military, schools.',
        levels: allLevels,
      },
      {
        id: 'church-administration',
        name: 'Church Administration',
        summary: 'Management, governance and stewardship in the church.',
        levels: allLevels,
      },
      {
        id: 'pastoral-care',
        name: 'Pastoral Care',
        summary: 'Shepherding, visitation and spiritual formation.',
        levels: allLevels,
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
        levels: allLevels,
      },
      {
        id: 'christian-psychology',
        name: 'Christian Psychology',
        summary: 'Integration of psychology and Christian faith.',
        levels: allLevels,
      },
      {
        id: 'conflict-management',
        name: 'Conflict Management',
        summary: 'Mediation, peace-building and conflict resolution.',
        levels: allLevels,
      },
      {
        id: 'risk-management',
        name: 'Risk Management',
        summary: 'Identifying, assessing and mitigating organisational risks.',
        levels: allLevels,
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
        levels: allLevels,
      },
      {
        id: 'it-cybersecurity',
        name: 'IT / Cybersecurity',
        summary: 'IT fundamentals, networks and cyber threat protection.',
        levels: allLevels,
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

export function studyModeById(id: string) {
  return studyModes.find(mode => mode.id === id) ?? null
}

export function programmeCount(): number {
  return prospectusSchools.reduce((sum, school) => sum + school.programmes.length, 0)
}
