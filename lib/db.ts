import Dexie, { type EntityTable } from 'dexie'
import type { Attempt, Exam, ImportedDraft, Lesson, Mistake, Question } from '@/lib/domain'
import type { Repositories } from '@/lib/repositories'

class TsaDatabase extends Dexie {
  lessons!: EntityTable<Lesson, 'id'>
  questions!: EntityTable<Question, 'id'>
  exams!: EntityTable<Exam, 'id'>
  attempts!: EntityTable<Attempt, 'id'>
  mistakes!: EntityTable<Mistake, 'id'>
  drafts!: EntityTable<ImportedDraft, 'id'>

  constructor() {
    super('tsa-focus-db')
    this.version(1).stores({
      lessons: 'id, subject, topic, progress',
      questions: 'id, subject, topic, difficulty, *skills',
      exams: 'id, status, createdAt',
      attempts: 'id, examId, completedAt',
      mistakes: 'id, questionId, mastered, wrongCount',
      drafts: 'id, status, createdAt',
    })
    this.version(2)
      .stores({
        lessons: 'id, subject, topic, progress',
        questions: 'id, subject, topic, difficulty, *skills, *gradeLevels',
        exams: 'id, status, createdAt',
        attempts: 'id, examId, completedAt',
        mistakes: 'id, questionId, mastered, wrongCount, lastReviewedAt',
        drafts: 'id, status, createdAt',
      })
      .upgrade(async (transaction) => {
        await transaction.table('questions').toCollection().modify((question) => {
          question.gradeLevels ??= [12]
        })
      })
    this.version(3)
      .stores({
        lessons: 'id, subject, topic, progress',
        questions: 'id, subject, topic, difficulty, *skills, *gradeLevels',
        exams: 'id, status, createdAt',
        attempts: 'id, examId, completedAt',
        mistakes: 'id, questionId, mastered, wrongCount, lastReviewedAt',
        drafts: 'id, status, createdAt',
      })
      .upgrade(async (transaction) => {
        const hasAttempts = (await transaction.table('attempts').count()) > 0
        if (!hasAttempts) {
          await transaction.table('lessons').toCollection().modify({ progress: 0 })
        }
      })
  }
}

export const db = new TsaDatabase()

export const seedLessons: Lesson[] = [
  { id: 'lesson-derivative', title: 'Đạo hàm và đồ thị', summary: 'Đọc biến thiên, tiếp tuyến và cực trị theo tư duy TSA.', subject: 'Toán học', topic: 'Giải tích', durationMinutes: 32, progress: 0, content: 'Đạo hàm mô tả tốc độ thay đổi. Trong bài TSA, hãy ưu tiên đọc dấu của đạo hàm và liên hệ trực tiếp với chiều biến thiên của hàm số.' },
  { id: 'lesson-mechanics', title: 'Động lực học hệ vật', summary: 'Sơ đồ lực và chiến lược chọn hệ quy chiếu.', subject: 'Vật lý', topic: 'Cơ học', durationMinutes: 28, progress: 0, content: 'Bước đầu tiên là cô lập vật, biểu diễn đầy đủ trọng lực, phản lực, lực căng và ma sát. Chọn chiều dương cùng chiều chuyển động dự kiến để giảm sai dấu.' },
  { id: 'lesson-redox', title: 'Phản ứng oxi hóa – khử', summary: 'Cân bằng electron và bảo toàn điện tích.', subject: 'Hóa học', topic: 'Phản ứng hóa học', durationMinutes: 24, progress: 0, content: 'Xác định số oxi hóa thay đổi, viết quá trình nhường nhận electron, cân bằng electron rồi hoàn thiện nguyên tố và điện tích.' },
  { id: 'lesson-reading', title: 'Đọc hiểu dữ liệu', summary: 'Tìm luận điểm, bằng chứng và suy luận hợp lý.', subject: 'Ngữ văn', topic: 'Đọc hiểu', durationMinutes: 20, progress: 0, content: 'Phân biệt thông tin được nêu trực tiếp với kết luận suy ra. Mỗi suy luận hợp lệ phải có ít nhất một bằng chứng rõ ràng trong văn bản.' },
]

export const seedQuestions: Question[] = [
  { id: 'q1', stem: 'Cho hàm số có đạo hàm f′(x) = (x − 1)(x + 2). Hàm số nghịch biến trên khoảng nào?', type: 'single', options: ['(−∞; −2)', '(−2; 1)', '(1; +∞)', '(−∞; 1)'], correctAnswers: ['(−2; 1)'], explanation: 'Tích (x − 1)(x + 2) âm khi hai thừa số trái dấu, tức −2 < x < 1.', subject: 'Toán học', topic: 'Đạo hàm', skills: ['Xét dấu', 'Đọc khoảng'], difficulty: 'Cơ bản', gradeLevels: [12], points: 1 },
  { id: 'q2', stem: 'Một vật khối lượng 2 kg chịu hợp lực không đổi 6 N. Gia tốc của vật bằng bao nhiêu m/s²?', type: 'numeric', options: [], correctAnswers: ['3'], explanation: 'Theo định luật II Newton: a = F/m = 6/2 = 3 m/s².', subject: 'Vật lý', topic: 'Định luật Newton', skills: ['Mô hình hóa'], difficulty: 'Cơ bản', gradeLevels: [10], tolerance: 0.01, points: 1 },
  { id: 'q3', stem: 'Chọn các phát biểu đúng về phản ứng oxi hóa – khử.', type: 'multiple', options: ['Có sự chuyển electron', 'Số oxi hóa luôn không đổi', 'Chất khử nhường electron', 'Chất oxi hóa nhường electron'], correctAnswers: ['Có sự chuyển electron', 'Chất khử nhường electron'], explanation: 'Phản ứng có sự thay đổi số oxi hóa; chất khử là chất nhường electron.', subject: 'Hóa học', topic: 'Oxi hóa – khử', skills: ['Nhận biết'], difficulty: 'Vận dụng', gradeLevels: [10], points: 1 },
  { id: 'q4', stem: 'Kết luận suy ra từ văn bản luôn phải được nêu nguyên văn trong văn bản.', type: 'true-false', options: ['Đúng', 'Sai'], correctAnswers: ['Sai'], explanation: 'Suy luận có thể không được nêu nguyên văn nhưng phải dựa trên bằng chứng trong văn bản.', subject: 'Ngữ văn', topic: 'Đọc hiểu', skills: ['Suy luận'], difficulty: 'Cơ bản', gradeLevels: [12], points: 1 },
]

export const seedExam: Exam = { id: 'exam-starter', title: 'TSA Sprint 01', description: 'Bài luyện tổng hợp khởi động theo 4 nhóm năng lực.', durationMinutes: 20, questionIds: seedQuestions.map((question) => question.id), status: 'published', createdAt: '2026-09-03T00:00:00.000Z' }

export async function ensureSeedData() {
  await db.transaction('rw', [db.lessons, db.questions, db.exams], async () => {
    if ((await db.lessons.count()) === 0) await db.lessons.bulkPut(seedLessons)
    if ((await db.questions.count()) === 0) await db.questions.bulkPut(seedQuestions)
    if ((await db.exams.count()) === 0) await db.exams.put(seedExam)
  })
}

export const indexedDbRepositories: Repositories = {
  lessons: {
    list: () => db.lessons.toArray(),
    save: (item) => db.lessons.put(item).then(() => undefined),
  },
  quizzes: {
    listExams: () => db.exams.reverse().sortBy('createdAt'),
    getExam: (id) => db.exams.get(id),
    getQuestions: async (ids) => {
      const items = await db.questions.bulkGet(ids)
      return items.filter((item): item is Question => Boolean(item))
    },
    saveExam: async (exam, questions) => {
      await db.transaction('rw', [db.exams, db.questions], async () => {
        await db.questions.bulkPut(questions)
        await db.exams.put(exam)
      })
    },
  },
  attempts: {
    list: () => db.attempts.reverse().sortBy('completedAt'),
    save: (attempt) => db.attempts.put(attempt).then(() => undefined),
  },
  mistakes: {
    list: () => db.mistakes.reverse().sortBy('wrongCount'),
    record: (item) => db.mistakes.put(item).then(() => undefined),
    markMastered: (id, mastered) => db.mistakes.update(id, { mastered, lastReviewedAt: new Date().toISOString() }).then(() => undefined),
  },
  drafts: {
    list: () => db.drafts.reverse().sortBy('createdAt'),
    save: (item) => db.drafts.put(item).then(() => undefined),
  },
}
