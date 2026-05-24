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
    'We develop ethical, capable leaders through accredited management and leadership qualifications — delivered with flexibility, rigour, and real-world relevance.',
  accreditation: [
    'NQF-aligned programmes from levels 4 through 10',
    'Recognised pathways for professional development in South Africa and Zambia',
    'Structured online learning with expert lecturer support',
  ],
  values: [
    { title: 'Excellence', desc: 'High academic standards and practical outcomes for every learner.' },
    { title: 'Integrity', desc: 'Ethical leadership and transparent processes from application to certification.' },
    { title: 'Access', desc: 'Study online at your pace with flexible payment options.' },
    { title: 'Support', desc: 'Dedicated guidance through enrolment, learning, and assessment.' },
  ],
}

export type NqfPathwayRow = {
  level: string
  qualificationType: string
  entryRequirement: string
  duration: string
  nextStep: string
}

export const nqfPathwayIntro = {
  title: 'Your Academic Pathway at PBK Memorial: NQF Levels 1 to 10',
  body: 'At PBK Memorial Management and Leadership Institute, we are committed to guiding you from your first qualification all the way to a Doctoral Degree. South Africa\'s National Qualifications Framework (NQF) provides a clear path for progression. Here\'s how you can advance with us:',
}

export const nqfPathwayRows: NqfPathwayRow[] = [
  {
    level: 'NQF 1',
    qualificationType: 'Grade 9 / ABET Level 4',
    entryRequirement: 'No formal requirement',
    duration: '1 year',
    nextStep: 'Proceed to NQF 2–4 programmes',
  },
  {
    level: 'NQF 2–4',
    qualificationType: 'National Certificates, Higher Certificate or Diploma',
    entryRequirement: 'Grade 10–12, Matric, NQF 1 or equivalent',
    duration: '1–3 years',
    nextStep: 'Access NQF 5',
  },
  {
    level: 'NQF 5',
    qualificationType: 'Higher Certificate',
    entryRequirement: 'NQF 4 / Matric',
    duration: '1 year',
    nextStep: 'Proceed to NQF 6 Diploma or Advanced Certificate',
  },
  {
    level: 'NQF 6',
    qualificationType: 'Diploma / Advanced Certificate',
    entryRequirement: 'NQF 4 or NQF 5',
    duration: '1–2 years',
    nextStep: 'Proceed to NQF 7 Advanced Diploma or Bachelor\'s Degree',
  },
  {
    level: 'NQF 7',
    qualificationType: 'Bachelor\'s Degree / Advanced Diploma',
    entryRequirement: 'NQF 6 Diploma',
    duration: '1–3 years',
    nextStep: 'Qualify for NQF 8 Honours / Postgraduate Diploma',
  },
  {
    level: 'NQF 8',
    qualificationType: 'Honours Degree / Postgraduate Diploma',
    entryRequirement: 'NQF 7 Bachelor\'s Degree, min. 60% average',
    duration: '1 year',
    nextStep: 'Qualify for NQF 9 Master\'s Degree',
  },
  {
    level: 'NQF 9',
    qualificationType: 'Master\'s Degree',
    entryRequirement: 'NQF 8 Honours or equivalent + research proposal',
    duration: '1–2 years',
    nextStep: 'Qualify for NQF 10 Doctoral Degree',
  },
  {
    level: 'NQF 10',
    qualificationType: 'Doctoral Degree / PhD',
    entryRequirement: 'NQF 9 Master\'s Degree + approved research proposal',
    duration: '2–4 years',
    nextStep: 'Highest academic qualification',
  },
]

export const nqfProgressionNotes = [
  'Entry requirements: Successful completion of the previous NQF level is generally required. Some postgraduate programmes require a minimum average of 60–65%.',
  'Recognition of Prior Learning (RPL): Relevant work experience may allow entry at a higher level without formal prior qualifications.',
  'Bridging courses: PBK offers bridging programmes for learners who do not meet direct entry requirements for their chosen qualification.',
  'Accreditation: All PBK programmes are aligned with SAQA and the NQF for national and international recognition.',
]

export const educationProgrammes = [
  {
    title: 'Management & leadership qualifications',
    levels: 'NQF 4 – 10',
    delivery: 'Online and in-person options',
    highlights: [
      'Modular structure with formative and summative assessments',
      'Progress tracking through the student portal',
      'Certificates upon successful completion',
    ],
  },
  {
    title: 'Flexible study & payments',
    levels: 'Self-paced within programme guidelines',
    delivery: 'Access materials from any device',
    highlights: [
      'Pay course fees in 3, 6, or 12 monthly instalments',
      'Proof-of-payment workflow for bank transfers',
      'Admin-reviewed applications before full access',
    ],
  },
]

export const applySteps = [
  { step: 1, title: 'Create your account', desc: 'Register with your email and set a secure password.' },
  { step: 2, title: 'Choose a programme', desc: 'Browse available qualifications and select the one that fits your goals.' },
  { step: 3, title: 'Submit your application', desc: 'Complete the enrolment form for your chosen programme.' },
  { step: 4, title: 'Payment & approval', desc: 'Upload proof of payment if required; access your course once approved.' },
]

export const partnerLogos = [
  { id: 'aasa', name: 'AASA', src: '/logos/partners/aasa.jpeg' },
  { id: 'aetmps', name: 'AETMPS', src: '/logos/partners/aetmps.jpeg' },
  { id: 'eae', name: 'EAE', src: '/logos/partners/eae.jpeg' },
  { id: 'eimt', name: 'EIMT', src: '/logos/partners/eimt.jpeg' },
  { id: 'esms', name: 'ESMS', src: '/logos/partners/esms.jpeg' },
  { id: 'etdp', name: 'ETDP', src: '/logos/partners/etdp.jpeg' },
  { id: 'ibr', name: 'IBR', src: '/logos/partners/ibr.jpeg' },
  { id: 'ieac', name: 'IEAC', src: '/logos/partners/ieac.jpeg' },
  { id: 'pbkmli', name: 'PBK Memorial Leadership Institute', src: '/logos/partners/pbkmli.jpeg' },
  { id: 'qcto', name: 'QCTO', src: '/logos/partners/qcto.jpeg' },
] as const

/** Center nav only — Apply is the blue button on the right */
export const mainNavLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/education', label: 'Education' },
  { href: '/team', label: 'Our Team' },
] as const

export const navLinks = [
  ...mainNavLinks,
  { href: '/apply', label: 'Apply' },
] as const
