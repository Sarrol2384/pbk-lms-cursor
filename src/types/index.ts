export type UserRole = 'super_admin' | 'admin' | 'lecturer' | 'student'
export type EnrollmentStatus = 'pending' | 'approved' | 'rejected' | 'suspended'
export type PaymentStatus = 'pending' | 'approved' | 'rejected'
export type AssessmentType = 'formative_quiz' | 'assignment' | 'module_test' | 'final_exam'
export type SubmissionStatus = 'submitted' | 'graded' | 'returned'
export type CourseStatus = 'draft' | 'published' | 'archived'

export interface Profile {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  id_number: string | null
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface Course {
  id: string
  title: string
  code: string
  nqf_level: number
  credits: number
  saqa_id: string | null
  description: string | null
  status: CourseStatus
  fee: number | null
  duration_months: number | null
  created_at: string
}

export interface Module {
  id: string
  course_id: string
  title: string
  description: string | null
  sequence: number
  credits: number
  pass_mark: number
  created_at: string
}

export interface Unit {
  id: string
  module_id: string
  title: string
  content: string | null
  video_url: string | null
  sequence: number
}

export interface Enrollment {
  id: string
  user_id: string
  course_id: string
  status: EnrollmentStatus
  enrolled_at: string | null
}

export interface Payment {
  id: string
  user_id: string
  course_id: string
  amount: number
  status: PaymentStatus
  proof_url: string | null
  rejection_reason: string | null
  created_at: string
}

export interface Assessment {
  id: string
  module_id: string
  title: string
  type: AssessmentType
  total_marks: number
  weight: number
  due_date: string | null
}

export interface Submission {
  id: string
  assessment_id: string
  user_id: string
  file_url: string | null
  answers: Record<string, unknown> | null
  status: SubmissionStatus
  marks_obtained: number | null
  feedback: string | null
  submitted_at: string
}

export interface Certificate {
  id: string
  user_id: string
  course_id: string
  certificate_number: string
  issued_at: string
}
