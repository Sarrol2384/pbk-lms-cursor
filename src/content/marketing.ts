import { formatUsd } from '@/lib/tuition'
import {
  CHAPLAINCY_PATH,
  PROGRESSION_NOTES,
  STUDY_PATHWAY_INTRO,
  pathwayFacts,
  type FeeTrack,
} from '@/content/programme-fees'
import { INDAGATION_PATH } from './indagation'

export type TeamMember = {
  id: string
  name: string
  role: string
  bio: string
  philosophy?: string
  /** Place image at public/team/ — see public/team/README.md */
  photoUrl?: string | null
}

export const teamMembers: TeamMember[] = [
  {
    id: 'hans-kuzanga',
    name: 'Professor Hans Kajiba Kuzanga',
    role: 'Founder / President',
    photoUrl: '/team/hans-kuzanga.jpg',
    bio: 'Dr. Hans Kajiba Kuzanga is a visionary leader, educator, and mentor, serving as Founder and President of the PBK Memorial Leadership Institute. He is dedicated to empowering pastors, church leaders, and organizations through transformative education and values-based leadership development. With a multidisciplinary academic background spanning broadcasting, business administration, organizational leadership, divinity, Christian education, psychology, and business administration at doctoral level, Dr. Kuzanga brings a holistic and strategic approach to leadership formation grounded in excellence and integrity.',
  },
  {
    id: 'neave-kannemeyer',
    name: 'Prof. Neave Kannemeyer',
    role: 'Chancellor',
    photoUrl: '/team/neave-kannemeyer.jpg',
    bio: 'A leadership mentor and educator dedicated to empowering leaders through transformative education and community-focused development. My work centers on equipping individuals to lead with excellence, integrity, and purpose. With an interdisciplinary academic background—including qualifications in business, forensic science, divinity, education, and safety & security—I bring a holistic, strategic perspective to leadership development and collaborative initiatives aimed at sustainable community impact.',
  },
  {
    id: 'jacobus-luus',
    name: 'Dr. Jacobus Luus',
    role: 'Vice Chancellor',
    photoUrl: '/team/jacobus-luus.jpg',
    bio: 'Johannes Jacobus (Jakes) Luus is a senior business leader and Non-Executive Director with over 25 years of executive and board-level experience across Africa\'s mining, construction, heavy equipment, and industrial services sectors. He has led multi-country operations across Southern and West Africa and brings deep expertise in corporate governance, enterprise risk management, and board committee leadership, including Audit & Risk, Strategy, and Operations, with a strong focus on performance oversight and value-driven execution.',
  },
  {
    id: 'sharon-hugo',
    name: 'Sharon Hugo',
    role: 'Administrative Registrar',
    photoUrl: '/team/sharon-hugo.jpg',
    bio: 'Sharon Hugo is a seasoned business operations and administration executive with over 20 years of experience driving operational efficiency and organizational performance. She is recognized for strong leadership, strategic planning, and the ability to optimize resources while effectively managing cross-functional teams. Her expertise includes operations optimization, financial management, process improvement, and departmental restructuring, with a proven track record of enhancing productivity, reducing costs, and implementing modern, paperless administrative systems. She holds a Diploma in Business Administration.',
  },
  {
    id: 'abraham-matthews',
    name: 'Dr Abraham Matthews',
    role: 'Deputy Vice Chancellor — Biblical Studies',
    photoUrl: '/team/abraham-matthews.jpg',
    bio: 'A devoted servant leader and student of biblical studies. He holds an Honorary Doctorate in Divinity (2022) and a Doctorate in Theology (2025). He was ordained as a Pastor in 2024 and leads a Divorce Support Group with his wife.',
  },
  {
    id: 'letitia-matthews',
    name: 'Dr Letitia Matthews',
    role: 'Deputy Vice Chancellor — Administration & Finance',
    photoUrl: '/team/letitia-matthews.jpeg',
    bio: 'A business professional with over 35 years of experience in the commercial sector, including roles as a Depot Manager and Sales Representative. She was ordained as a Pastor in 2024 and leads a Divorce Support Group with her husband.',
  },
  {
    id: 'mpumelelo-mzizi',
    name: 'Bishop Prof Dr. Mpumelelo Alfred Mzizi',
    role: 'Deputy Vice Chancellor — Research and Innovation',
    photoUrl: '/team/mpumelelo-mzizi.jpeg',
    bio: 'A faith-driven leader and community servant. He is a traditional and cultural leader in South Africa\'s arts and heritage sectors. He is a former Umkhonto we Sizwe (MK) soldier and is involved in global Christian councils and food security initiatives.',
  },
  {
    id: 'ndileka-jacobs-stokwe',
    name: 'Mrs. Ndileka Roselyn Jacobs-Stokwe',
    role: 'Academic Registrar',
    photoUrl: '/team/ndileka-jacobs-stokwe.jpg',
    bio: 'An Executive Secretary and Qualified Protocol Practitioner with 45 years of service, including time at Nelson Mandela University. Her expertise includes executive administration, HR, international protocol, and risk management.',
  },
  {
    id: 'wezi-mchilwa',
    name: 'Wezi Chata Mchilwa',
    role: 'Deputy Vice Chancellor — Skills Development (Zambia)',
    photoUrl: '/team/wezi-mchilwa.jpg',
    bio: 'Automotive engineering professional and Co-Founder of Treetopia Farm, serving as Lecturer at Industrial Training Centre. Brings expertise in vehicle assessment, traffic law, and safety.',
  },
  {
    id: 'kevin-williams',
    name: 'Dr Kevin J. Williams',
    role: 'Public Relations Officer',
    photoUrl: '/team/kevin-williams.jpg',
    bio: 'South African theologian, author, and retired SAPS Captain with 40 years in law enforcement. Holds doctorates in Leadership and Community Development.',
  },
  {
    id: 'herbert-banda',
    name: 'Prof. Herbert Banda',
    role: 'Deputy Vice Chancellor — Academic Studies',
    photoUrl: '/team/herbert-banda.jpg',
    bio: 'Educator, philanthropist, and entrepreneur with 35 years in the education sector. Expertise in quality management systems, human capital development, and strategic problem-solving.',
  },
  {
    id: 'chali-kasonde',
    name: 'Bishop Chali Kasonde',
    role: 'Chairman of the Board — Zambia',
    photoUrl: '/team/chali-kasonde.jpg',
    bio: 'Zambian Christian leader and Founding Pastor of New Beginnings Christian Church. Background in theology (Trans Africa Theological College) and various pastoral roles.',
  },
  {
    id: 'patchinwe-ejiogu',
    name: 'Prof Dr Patricia Chinwe O.O. Ejiogu',
    role: 'Head of Health Sciences',
    photoUrl: '/team/patchinwe-ejiogu.jpg',
    bio: [
      'Prof Dr Patricia Chinwe O.O. Ejiogu is a Professor of Public Health with a focus on medical epidemiology and clinical toxicology. She is the President and Founder of Think Plan Execute Global Inc. and the Founder of P&A Health Services in Maryland, USA.',
      'Her multidisciplinary background spans public health, medical laboratory science, psychology, addiction counselling, divinity, autism support and rehabilitation medicine. She holds master\'s degrees in Addiction Counselling and Divinity, and doctorates in Divinity and Psychology from Charisma University. She is a licensed clinical psychologist and medical laboratory scientist in Nigeria, and a certified chaplain through the International Circle of Faith.',
      'A committed philanthropist and humanitarian, she supports orphans, widows and disadvantaged communities through education, health promotion, mental health awareness, skills development and disaster relief. Her guiding message: "Think. Plan. Execute. Serve Humanity. Transform Lives."',
    ].join('\n\n'),
  },
  {
    id: 'sarrol-von-willingh',
    name: 'Sarrol Von Willingh',
    role: 'Head of IT',
    photoUrl: '/team/sarrol-von-willingh.jpg',
    bio: 'Sarrol Von Willingh is an entrepreneur with a strong passion for AI, technology, and practical innovation. He is dedicated to helping educators and trainers grow through smart digital solutions, custom software, and simple systems that make online teaching and learning more effective. Known for his ability to create tailored systems quickly, Sarrol also provides hands-on training and ongoing support to help clients use technology with confidence. Guided by strong values and a genuine desire to serve others, he believes technology should be used to create meaningful impact and lasting growth.',
    philosophy: 'Technology should empower people to teach, grow, and serve with greater impact.',
  },
]

export const aboutSections = {
  mission:
    'We develop ethical, capable leaders through globally accredited management and leadership qualifications — delivered with flexibility, rigour, and real-world relevance.',
  accreditation: [
    'Globally accredited management and leadership programmes',
    'Study options for learners in South Africa and Zambia',
    'Structured online learning with expert lecturer support',
  ],
  values: [
    { title: 'Excellence', desc: 'High academic standards and practical outcomes for every learner.' },
    { title: 'Integrity', desc: 'Ethical leadership and transparent processes from application to certification.' },
    { title: 'Access', desc: 'Study online at your pace with flexible payment options.' },
    { title: 'Support', desc: 'Dedicated guidance through enrolment, learning, and assessment.' },
  ],
}

export type StudyPathwayRow = {
  level: string
  qualificationType: string
  entryRequirement: string
  duration: string
  tuition: string
  registration: string
  nextStep: string
}

export const studyPathwayIntro = STUDY_PATHWAY_INTRO
export const studyProgressionNotes = PROGRESSION_NOTES

function pathwayRows(track: FeeTrack): StudyPathwayRow[] {
  return pathwayFacts(track).map(fact => ({
    level: fact.levelLabel,
    qualificationType: fact.qualificationName,
    entryRequirement: fact.entryRequirement,
    duration: fact.duration,
    tuition: formatUsd(fact.tuitionUsd),
    registration: formatUsd(fact.registrationUsd),
    nextStep: fact.nextStep,
  }))
}

export const academicPathwayRows = pathwayRows('academic')
export const theologyPathwayRows = pathwayRows('theology')

export const educationProgrammes = [
  {
    title: 'Management & leadership qualifications',
    levels: "Certificate through Bachelor's, with Master's and PhD via RPL where a programme lists them",
    delivery: 'Online and in-person options',
    highlights: [
      'Modular structure with formative and summative assessments',
      'Progress tracking through the student portal',
      'Certificate of Completion after the programme and full tuition; the formal certificate is presented at graduation',
    ],
  },
  {
    title: 'Flexible study & payments',
    levels: 'Self-paced within programme guidelines',
    delivery: 'Access materials from any device',
    highlights: [
      'Pay course fees in US dollars. A deposit of 30% to 50% of the total fee, then monthly instalments for the balance',
      'Proof-of-payment workflow for bank transfers',
      'Admin-reviewed applications before full access',
    ],
  },
]

export const applySteps = [
  { step: 1, title: 'Create your account', desc: 'Register with your email and set a secure password.' },
  { step: 2, title: 'Choose a programme', desc: 'Browse available qualifications and select the one that fits your goals.' },
  { step: 3, title: 'Submit your application', desc: 'Complete the enrolment form for your chosen programme.' },
  { step: 4, title: 'Approval, then payment', desc: 'After an administrator approves your application, choose a payment plan and upload proof of payment. Fees are in US dollars. A deposit of 30% to 50% of the total fee, then monthly instalments for the balance. Course access opens once that deposit is verified.' },
]

/**
 * Memoranda of Understanding. Logos were supplied by PBK and saved under
 * public/logos/partners/. The older circular eimt.jpeg in the marquee is a
 * separate mark and is not this wordmark.
 */
export const mouPartners = [
  {
    id: 'eimt',
    name: 'EIMT',
    detail: 'European Institute of Management & Technology',
    alt: 'EIMT, European Institute of Management & Technology',
    src: '/logos/partners/eimt.webp',
    width: 960,
    height: 331,
  },
  {
    id: 'euroamerican',
    name: 'EuroAmerican Education',
    detail: null,
    alt: 'EuroAmerican Education',
    src: '/logos/partners/euroamerican.webp',
    width: 960,
    height: 341,
  },
  {
    id: 'birchwood',
    name: 'Birchwood University',
    detail: null,
    alt: 'Birchwood University',
    src: '/logos/partners/birchwood.webp',
    width: 960,
    height: 356,
  },
] as const

export const mouPartnersStatement =
  'PBK has Memoranda of Understanding with EIMT (European Institute of Management & Technology), EuroAmerican Education and Birchwood University.'

export const partnerLogos = [
  { id: 'aasa', name: 'AASA', src: '/logos/partners/aasa.jpeg' },
  { id: 'aetmps', name: 'AETMPS', src: '/logos/partners/aetmps.jpeg' },
  { id: 'eae', name: 'EAE', src: '/logos/partners/eae.jpeg' },
  { id: 'eimt', name: 'EIMT', src: '/logos/partners/eimt.jpeg' },
  { id: 'esms', name: 'ESMS', src: '/logos/partners/esms.jpeg' },
  { id: 'ibr', name: 'IBR', src: '/logos/partners/ibr.jpeg' },
  { id: 'pbkmli', name: 'PBK Memorial Leadership Institute', src: '/brand/pbk-emblem.webp' },
] as const

// QCTO and ETDP SETA logos are not shown. Both are South African NQF quality bodies,
// so displaying them implied that PBK qualifications are SAQA registered. They are not.

/** Center nav. Apply is the blue button on the right. */
export const chaplaincyLink = {
  href: CHAPLAINCY_PATH,
  label: 'Chaplaincy',
} as const

export const researchSupportLink = {
  href: INDAGATION_PATH,
  label: 'Research Support',
} as const

export const mainNavLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/education', label: 'Education' },
  chaplaincyLink,
  researchSupportLink,
  { href: '/team', label: 'Our Team' },
  { href: '/events', label: 'Events' },
  { href: '/contact', label: 'Contact' },
] as const

/** Phone menu uses the same links as the desktop bar. The footer adds Apply. */
export const mobileNavLinks = mainNavLinks

export const navLinks = [
  ...mobileNavLinks,
  { href: '/apply', label: 'Apply' },
] as const
