import { z } from 'zod'

export const subjectSchema = z.enum(['Toán học', 'Vật lý', 'Hóa học', 'Sinh học', 'Ngữ văn', 'Tiếng Anh'])
export const difficultySchema = z.enum(['Cơ bản', 'Vận dụng', 'Nâng cao'])
export const questionTypeSchema = z.enum(['single', 'multiple', 'true-false', 'numeric'])

export const questionSchema = z.object({
  id: z.string(),
  stem: z.string().min(1),
  type: questionTypeSchema,
  options: z.array(z.string()).default([]),
  correctAnswers: z.array(z.string()).min(1),
  explanation: z.string().min(1),
  subject: subjectSchema,
  topic: z.string().min(1),
  skills: z.array(z.string()).default([]),
  difficulty: difficultySchema,
  gradeLevels: z.array(z.number().int().min(10).max(12)).default([12]),
  tolerance: z.number().nonnegative().optional(),
  points: z.number().positive().default(1),
})

export const lessonSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  summary: z.string().min(1),
  subject: subjectSchema,
  topic: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  progress: z.number().min(0).max(100).default(0),
  content: z.string().min(1),
})

export const examSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string(),
  durationMinutes: z.number().int().positive(),
  questionIds: z.array(z.string()).min(1),
  status: z.enum(['draft', 'reviewed', 'published']).default('draft'),
  createdAt: z.string(),
})

export const importedExamSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(''),
  durationMinutes: z.number().int().min(5).max(180),
  questions: z.array(questionSchema.omit({ id: true })).min(1).max(60),
  warnings: z.array(z.string()).default([]),
})

export type Subject = z.infer<typeof subjectSchema>
export type Difficulty = z.infer<typeof difficultySchema>
export type Question = z.infer<typeof questionSchema>
export type Lesson = z.infer<typeof lessonSchema>
export type Exam = z.infer<typeof examSchema>
export type ImportedExam = z.infer<typeof importedExamSchema>

export interface Attempt {
  id: string
  examId: string
  answers: Record<string, string[]>
  score: number
  correctCount: number
  totalQuestions: number
  completedAt: string
}

export interface Mistake {
  id: string
  questionId: string
  selectedAnswers: string[]
  wrongCount: number
  lastReviewedAt?: string
  mastered: boolean
}

export interface ImportedDraft {
  id: string
  payload: ImportedExam
  createdAt: string
  status: 'draft' | 'reviewed' | 'published'
}

export function scoreQuestion(question: Question, answer: string[]): boolean {
  if (question.type === 'numeric') {
    const actual = Number(answer[0])
    const expected = Number(question.correctAnswers[0])
    return Number.isFinite(actual) && Math.abs(actual - expected) <= (question.tolerance ?? 0)
  }
  const selected = [...answer].sort()
  const expected = [...question.correctAnswers].sort()
  return selected.length === expected.length && selected.every((value, index) => value === expected[index])
}
