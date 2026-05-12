export type UserRole = 'student' | 'instructor' | 'admin' | 'alumni'
export type CourseStatus = 'draft' | 'pending' | 'published' | 'archived'
export type ContentType = 'video' | 'markdown' | 'document' | 'quiz'
export type SubmissionStatus = 'not_started' | 'submitted' | 'late' | 'graded'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  organization_id: string | null
  xp_points: number
  streak_days: number
  last_active: string | null
  created_at: string
  updated_at: string
}

export interface Course {
  id: string
  title: string
  description: string | null
  cover_image_url: string | null
  instructor_id: string
  organization_id: string | null
  status: CourseStatus
  is_free: boolean
  language: string
  created_at: string
  updated_at: string
  // joined fields
  instructor?: Profile
  modules?: Module[]
  enrollment_count?: number
}

export interface Module {
  id: string
  course_id: string
  title: string
  description: string | null
  position: number
  created_at: string
  lessons?: Lesson[]
}

export interface Lesson {
  id: string
  module_id: string
  title: string
  content: string | null
  content_type: ContentType
  video_url: string | null
  document_url: string | null
  quiz_data: QuizData | null
  position: number
  is_free_preview: boolean
  duration_seconds: number | null
  created_at: string
  updated_at: string
}

export interface QuizQuestion {
  id: string
  type: 'multiple_choice' | 'true_false'
  question: string
  options: string[]
  correct_index: number
  explanation?: string
}

export interface QuizData {
  passing_score: number   // percentage e.g. 70
  questions: QuizQuestion[]
}

export interface Enrollment {
  id: string
  student_id: string
  course_id: string
  enrolled_at: string
  course?: Course
}

export interface Assignment {
  id: string
  course_id: string
  lesson_id: string | null
  title: string
  description: string | null
  rubric: RubricItem[] | null
  due_date: string | null
  max_points: number
  allow_late: boolean
  created_at: string
}

export interface RubricItem {
  criterion: string
  max_points: number
  description: string
}

export interface Submission {
  id: string
  assignment_id: string
  student_id: string
  content: string | null
  file_url: string | null
  status: SubmissionStatus
  points_earned: number | null
  feedback: string | null
  submitted_at: string | null
  graded_at: string | null
  student?: Profile
  assignment?: Assignment
}

export interface SubmissionComment {
  id: string
  submission_id: string
  author_id: string
  body: string
  created_at: string
  author?: Profile
}

export interface LessonProgress {
  id: string
  student_id: string
  lesson_id: string
  is_completed: boolean
  completed_at: string | null
  last_accessed_at: string
}

export interface QuizAttempt {
  id: string
  lesson_id: string
  student_id: string
  score: number
  max_score: number
  passed: boolean
  answers: number[]
  attempted_at: string
}

export interface Certificate {
  id: string
  student_id: string
  course_id: string
  issued_at: string
  certificate_url: string | null
  course?: Course
}

export interface Discussion {
  id: string
  lesson_id: string
  author_id: string
  parent_id: string | null
  body: string
  upvotes: number
  is_endorsed: boolean
  created_at: string
  author?: Profile
  replies?: Discussion[]
}

export interface Notification {
  id: string
  user_id: string
  title: string
  body: string | null
  is_read: boolean
  link: string | null
  created_at: string
}

export interface OrganizationSettings {
  id: string
  organization_id: string
  name: string
  logo_url: string | null
  primary_color: string
  accent_color: string
  domain: string | null
  subscription_tier: string
  created_at: string
  updated_at: string
}
