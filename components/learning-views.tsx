'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowRight, BookOpen, Brain, Clock3, Target, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'
import { indexedDbRepositories } from '@/lib/db'
import type { Lesson } from '@/lib/domain'

export function DashboardView({ onNavigate }: { onNavigate: (view: string) => void }) {
  const lessons = useLiveQuery(() => indexedDbRepositories.lessons.list(), []) ?? []
  const attempts = useLiveQuery(() => indexedDbRepositories.attempts.list(), []) ?? []
  const mistakes = useLiveQuery(() => indexedDbRepositories.mistakes.list(), []) ?? []
  const average = attempts.length ? Math.round(attempts.reduce((sum, item) => sum + item.score, 0) / attempts.length) : 0
  const studiedLessons = lessons.filter((item) => item.progress > 0)
  const hasActivity = attempts.length > 0 || studiedLessons.length > 0

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 lg:grid-cols-[1.65fr_1fr]">
        <Card className="relative overflow-hidden bg-primary text-primary-foreground ring-0">
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Lộ trình hôm nay</Badge>
            <CardTitle className="max-w-xl text-balance font-serif text-3xl leading-tight md:text-4xl">{hasActivity ? 'Tập trung vào điểm yếu, tiến bộ bằng từng phiên học ngắn.' : 'Bắt đầu hành trình TSA từ một phiên học ngắn.'}</CardTitle>
            <CardDescription className="max-w-lg text-primary-foreground/70">{hasActivity ? 'Chọn một bài học hoặc tiếp tục luyện đề dựa trên lịch sử của bạn.' : 'Bạn chưa có hoạt động học tập. Hãy chọn bài học đầu tiên hoặc làm bài luyện khởi động.'}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="secondary" size="lg" onClick={() => onNavigate('quiz')}>
              Bắt đầu phiên học <ArrowRight data-icon="inline-end" />
            </Button>
            <Button variant="outline" size="lg" className="border-primary-foreground/20 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" onClick={() => onNavigate('lessons')}>Mở kho bài học</Button>
          </CardContent>
          <div aria-hidden="true" className="absolute -right-12 -bottom-20 size-64 rounded-full border-[34px] border-primary-foreground/10" />
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Điểm sẵn sàng</CardDescription>
            <CardTitle className="font-serif text-5xl">{average}<span className="text-xl text-muted-foreground">/100</span></CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Progress value={average}>
              <ProgressLabel>Tiến độ mục tiêu</ProgressLabel>
              <ProgressValue>{() => `${average}%`}</ProgressValue>
            </Progress>
            <p className="text-pretty leading-6 text-muted-foreground">{attempts.length > 0 ? 'Điểm này được tính từ các bài luyện bạn đã hoàn thành.' : 'Chưa có dữ liệu. Hoàn thành bài luyện đầu tiên để tính điểm sẵn sàng.'}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Bài đã học', value: studiedLessons.length, icon: BookOpen },
          { label: 'Lượt luyện', value: attempts.length, icon: Target },
          { label: 'Câu cần ôn', value: mistakes.filter((item) => !item.mastered).length, icon: Brain },
          { label: 'Chuỗi học', value: '0 ngày', icon: TrendingUp },
        ].map((item) => (
          <Card key={item.label} size="sm">
            <CardHeader>
              <item.icon className="text-muted-foreground" aria-hidden="true" />
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className="font-serif text-2xl">{item.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-4">
          <div><p className="text-sm font-medium text-primary">Dành cho bạn</p><h2 className="font-serif text-2xl">Bài học đề xuất</h2></div>
          <Button variant="ghost" onClick={() => onNavigate('lessons')}>Xem tất cả <ArrowRight data-icon="inline-end" /></Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {lessons.slice(0, 3).map((lesson) => <LessonCard key={lesson.id} lesson={lesson} />)}
        </div>
      </section>
    </div>
  )
}

function LessonCard({ lesson }: { lesson: Lesson }) {
  return (
    <Card>
      <CardHeader>
        <CardAction><Badge variant="outline">{lesson.subject}</Badge></CardAction>
        <CardTitle>{lesson.title}</CardTitle>
        <CardDescription className="text-pretty leading-6">{lesson.summary}</CardDescription>
      </CardHeader>
      <CardContent>
        <Progress value={lesson.progress}>
          <ProgressLabel>{lesson.topic}</ProgressLabel>
          <ProgressValue>{() => `${lesson.progress}%`}</ProgressValue>
        </Progress>
      </CardContent>
      <CardFooter className="justify-between gap-3">
        <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 aria-hidden="true" /> {lesson.durationMinutes} phút</span>
        <Button variant="ghost" size="sm">{lesson.progress > 0 ? 'Học tiếp' : 'Bắt đầu học'} <ArrowRight data-icon="inline-end" /></Button>
      </CardFooter>
    </Card>
  )
}

export function LessonsView() {
  const lessons = useLiveQuery(() => indexedDbRepositories.lessons.list(), []) ?? []
  return (
    <div className="flex flex-col gap-5">
      <div><p className="text-sm font-medium text-primary">Thư viện kiến thức</p><h1 className="text-balance font-serif text-3xl">Kho bài học TSA</h1><p className="mt-1 max-w-2xl text-pretty leading-6 text-muted-foreground">Nội dung được tổ chức theo môn, chủ đề và kỹ năng thay vì ép vào một cây phân loại duy nhất.</p></div>
      <div className="flex flex-wrap gap-2">{['Tất cả', 'Toán học', 'Vật lý', 'Hóa học', 'Ngữ văn'].map((label, index) => <Badge key={label} variant={index === 0 ? 'default' : 'outline'}>{label}</Badge>)}</div>
      <div className="grid gap-4 md:grid-cols-2">{lessons.map((lesson) => <LessonCard key={lesson.id} lesson={lesson} />)}</div>
    </div>
  )
}

export function MistakesView() {
  const mistakes = useLiveQuery(() => indexedDbRepositories.mistakes.list(), []) ?? []
  const questions = useLiveQuery(async () => indexedDbRepositories.quizzes.getQuestions(mistakes.map((item) => item.questionId)), [mistakes.map((item) => item.questionId).join(',')]) ?? []
  return (
    <div className="flex flex-col gap-5">
      <div><p className="text-sm font-medium text-primary">Ôn tập có chủ đích</p><h1 className="font-serif text-3xl">Sổ câu sai</h1><p className="mt-1 leading-6 text-muted-foreground">Đánh dấu đã nắm vững sau khi bạn có thể tự giải lại mà không xem lời giải.</p></div>
      {mistakes.length === 0 ? <Card><CardHeader><CardTitle>Chưa có câu sai</CardTitle><CardDescription>Hoàn thành một bài luyện để hệ thống tạo danh sách ôn tập.</CardDescription></CardHeader></Card> : mistakes.map((mistake) => {
        const question = questions.find((item) => item.id === mistake.questionId)
        if (!question) return null
        return <Card key={mistake.id}><CardHeader><CardAction><Badge variant={mistake.mastered ? 'secondary' : 'outline'}>{mistake.mastered ? 'Đã nắm' : `${mistake.wrongCount} lần sai`}</Badge></CardAction><CardTitle className="pr-24 text-pretty">{question.stem}</CardTitle><CardDescription>{question.subject} · {question.topic}</CardDescription></CardHeader><CardContent><p className="leading-6 text-muted-foreground">{question.explanation}</p></CardContent><CardFooter><Button variant="outline" onClick={() => indexedDbRepositories.mistakes.markMastered(mistake.id, !mistake.mastered)}>{mistake.mastered ? 'Cần ôn lại' : 'Đánh dấu đã nắm'}</Button></CardFooter></Card>
      })}
    </div>
  )
}
