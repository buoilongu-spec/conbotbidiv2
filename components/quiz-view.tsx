'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CheckCircle2, ChevronLeft, ChevronRight, Clock3, Flag, RotateCcw, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { indexedDbRepositories } from '@/lib/db'
import { scoreQuestion, type Attempt, type Question } from '@/lib/domain'

export function QuizView() {
  const exams = useLiveQuery(() => indexedDbRepositories.quizzes.listExams(), []) ?? []
  const exam = exams[0]
  const questions = useLiveQuery(() => exam ? indexedDbRepositories.quizzes.getQuestions(exam.questionIds) : Promise.resolve([]), [exam?.id]) ?? []
  const [active, setActive] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [remaining, setRemaining] = useState(20 * 60)
  const [result, setResult] = useState<Attempt | null>(null)

  useEffect(() => { if (exam) setRemaining(exam.durationMinutes * 60) }, [exam?.id])
  useEffect(() => {
    if (result || remaining <= 0) return
    const timer = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [remaining, result])

  const question = questions[active]
  const answeredCount = useMemo(() => Object.values(answers).filter((answer) => answer.length).length, [answers])

  function toggleAnswer(value: string) {
    if (!question) return
    setAnswers((current) => {
      const existing = current[question.id] ?? []
      const next = question.type === 'multiple' ? (existing.includes(value) ? existing.filter((item) => item !== value) : [...existing, value]) : [value]
      return { ...current, [question.id]: next }
    })
  }

  async function submitQuiz() {
    if (!exam || !questions.length) return
    const correct = questions.filter((item) => scoreQuestion(item, answers[item.id] ?? [])).length
    const attempt: Attempt = { id: crypto.randomUUID(), examId: exam.id, answers, score: Math.round(correct / questions.length * 100), correctCount: correct, totalQuestions: questions.length, completedAt: new Date().toISOString() }
    await indexedDbRepositories.attempts.save(attempt)
    const oldMistakes = await indexedDbRepositories.mistakes.list()
    await Promise.all(questions.filter((item) => !scoreQuestion(item, answers[item.id] ?? [])).map((item) => {
      const existing = oldMistakes.find((mistake) => mistake.questionId === item.id)
      return indexedDbRepositories.mistakes.record({ id: existing?.id ?? item.id, questionId: item.id, selectedAnswers: answers[item.id] ?? [], wrongCount: (existing?.wrongCount ?? 0) + 1, mastered: false })
    }))
    setResult(attempt)
  }

  if (!exam || !question) return <Card><CardHeader><CardTitle>Đang chuẩn bị đề luyện</CardTitle><CardDescription>Dữ liệu mẫu đang được khởi tạo trong IndexedDB.</CardDescription></CardHeader></Card>

  if (result) return <QuizResult result={result} questions={questions} answers={answers} onRetry={() => { setResult(null); setAnswers({}); setActive(0); setRemaining(exam.durationMinutes * 60) }} />

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
      <Card>
        <CardHeader>
          <CardAction><Badge variant="outline"><Clock3 aria-hidden="true" /> {String(Math.floor(remaining / 60)).padStart(2, '0')}:{String(remaining % 60).padStart(2, '0')}</Badge></CardAction>
          <CardDescription>{exam.title} · Câu {active + 1}/{questions.length}</CardDescription>
          <CardTitle className="max-w-3xl text-pretty font-serif text-2xl leading-snug">{question.stem}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2"><Badge variant="secondary">{question.subject}</Badge><Badge variant="outline">{question.topic}</Badge><Badge variant="outline">{question.difficulty}</Badge></div>
          {question.type === 'numeric' ? <Input aria-label="Đáp án số" inputMode="decimal" placeholder="Nhập đáp án số" value={answers[question.id]?.[0] ?? ''} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: [event.target.value] }))} className="mt-3 max-w-xs" /> : (
            <div className="mt-3 flex flex-col gap-2" role={question.type === 'multiple' ? 'group' : 'radiogroup'} aria-label="Các phương án trả lời">
              {question.options.map((option, index) => {
                const selected = answers[question.id]?.includes(option)
                return <button key={option} type="button" role={question.type === 'multiple' ? 'checkbox' : 'radio'} aria-checked={selected} onClick={() => toggleAnswer(option)} className={cn('flex min-h-12 items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50', selected && 'border-primary bg-primary/5')}><span className={cn('flex size-7 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-xs', selected && 'bg-primary text-primary-foreground')}>{String.fromCharCode(65 + index)}</span><span>{option}</span></button>
              })}
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-between gap-3">
          <Button variant="outline" disabled={active === 0} onClick={() => setActive((value) => value - 1)}><ChevronLeft data-icon="inline-start" /> Trước</Button>
          {active === questions.length - 1 ? <Button onClick={submitQuiz}>Nộp bài <Flag data-icon="inline-end" /></Button> : <Button onClick={() => setActive((value) => value + 1)}>Tiếp <ChevronRight data-icon="inline-end" /></Button>}
        </CardFooter>
      </Card>
      <Card className="h-fit">
        <CardHeader><CardTitle>Bản đồ câu hỏi</CardTitle><CardDescription>Chọn số câu để di chuyển nhanh.</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Progress value={answeredCount / questions.length * 100}><ProgressLabel>Đã trả lời</ProgressLabel><ProgressValue>{() => `${answeredCount}/${questions.length}`}</ProgressValue></Progress>
          <div className="grid grid-cols-5 gap-2">{questions.map((item, index) => <Button key={item.id} size="icon" variant={index === active ? 'default' : answers[item.id]?.length ? 'secondary' : 'outline'} aria-label={`Đi đến câu ${index + 1}`} onClick={() => setActive(index)}>{index + 1}</Button>)}</div>
        </CardContent>
      </Card>
    </div>
  )
}

function QuizResult({ result, questions, answers, onRetry }: { result: Attempt; questions: Question[]; answers: Record<string, string[]>; onRetry: () => void }) {
  return <div className="flex flex-col gap-4"><Card className="bg-primary text-primary-foreground ring-0"><CardHeader><CardDescription className="text-primary-foreground/70">Kết quả phiên luyện</CardDescription><CardTitle className="font-serif text-5xl">{result.score}<span className="text-xl">/100</span></CardTitle></CardHeader><CardContent><p>Đúng {result.correctCount}/{result.totalQuestions} câu. Các câu sai đã được chuyển vào sổ ôn tập.</p></CardContent><CardFooter className="border-primary-foreground/10 bg-primary-foreground/5"><Button variant="secondary" onClick={onRetry}><RotateCcw data-icon="inline-start" /> Làm lại</Button></CardFooter></Card>{questions.map((question, index) => { const correct = scoreQuestion(question, answers[question.id] ?? []); return <Card key={question.id}><CardHeader><CardAction>{correct ? <CheckCircle2 className="text-primary" aria-label="Đúng" /> : <XCircle className="text-destructive" aria-label="Sai" />}</CardAction><CardDescription>Câu {index + 1} · {question.subject}</CardDescription><CardTitle className="pr-10 text-pretty">{question.stem}</CardTitle></CardHeader><CardContent className="flex flex-col gap-2"><p><strong>Đáp án:</strong> {question.correctAnswers.join(', ')}</p><p className="leading-6 text-muted-foreground">{question.explanation}</p></CardContent></Card>})}</div>
}
