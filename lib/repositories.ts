import type { Attempt, Exam, ImportedDraft, Lesson, Mistake, Question } from '@/lib/domain'

export interface ILessonRepository {
  list(): Promise<Lesson[]>
  save(item: Lesson): Promise<void>
}

export interface IQuizRepository {
  listExams(): Promise<Exam[]>
  getExam(id: string): Promise<Exam | undefined>
  getQuestions(ids: string[]): Promise<Question[]>
  saveExam(exam: Exam, questions: Question[]): Promise<void>
}

export interface IAttemptRepository {
  list(): Promise<Attempt[]>
  save(attempt: Attempt): Promise<void>
}

export interface IMistakeRepository {
  list(): Promise<Mistake[]>
  record(item: Mistake): Promise<void>
  markMastered(id: string, mastered: boolean): Promise<void>
}

export interface IImportedDraftRepository {
  list(): Promise<ImportedDraft[]>
  save(item: ImportedDraft): Promise<void>
}

export interface Repositories {
  lessons: ILessonRepository
  quizzes: IQuizRepository
  attempts: IAttemptRepository
  mistakes: IMistakeRepository
  drafts: IImportedDraftRepository
}
