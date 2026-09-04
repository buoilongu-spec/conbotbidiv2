'use client'

import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Bot, FileText, FileUp, Loader2, Send, Sparkles, X } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { GeminiSettingsCard } from '@/components/gemini-settings-card'
import { indexedDbRepositories } from '@/lib/db'
import { askTutor, extractExamWithGemini, GeminiPoolError, type GeminiResult } from '@/lib/gemini'
import { DEFAULT_GEMINI_MODEL, loadGeminiSettings, saveGeminiSettings, type GeminiSettings } from '@/lib/gemini-settings'
import type { ImportedDraft, ImportedExam } from '@/lib/domain'

const initialSettings: GeminiSettings = { model: DEFAULT_GEMINI_MODEL, activeKeyId: null, keys: [] }
type Attachment = { data: string; mimeType: string; name: string; size: number }

export function AIWorkspace() {
  const [settings, setSettings] = useState<GeminiSettings>(initialSettings)
  const [source, setSource] = useState('')
  const [attachment, setAttachment] = useState<Attachment>()
  const [preview, setPreview] = useState<ImportedExam | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const drafts = useLiveQuery(() => indexedDbRepositories.drafts.list(), []) ?? []

  useEffect(() => setSettings(loadGeminiSettings()), [])

  function updateSettings(next: GeminiSettings) {
    setSettings(next)
    saveGeminiSettings(next)
  }

  function applyResult<T>(result: GeminiResult<T>) {
    const rotated = settings.activeKeyId !== result.keyId || result.attemptedKeyIds.length > 1
    const next = {
      ...settings,
      activeKeyId: result.keyId,
      keys: settings.keys.map((key) => ({
        ...key,
        status: key.id === result.keyId ? 'ready' as const : result.attemptedKeyIds.includes(key.id) ? 'quota' as const : key.status,
      })),
    }
    updateSettings(next)
    setNotice(rotated ? `Đã tự chuyển sang “${next.keys.find((key) => key.id === result.keyId)?.label}” vì key trước chạm hạn mức.` : '')
  }

  function applyPoolError(cause: unknown) {
    if (!(cause instanceof GeminiPoolError)) return
    const invalidId = cause.kind === 'invalid' ? cause.keyIds.at(-1) : null
    updateSettings({
      ...settings,
      keys: settings.keys.map((key) => ({
        ...key,
        status: invalidId === key.id ? 'invalid' : cause.kind === 'quota' && cause.keyIds.includes(key.id) ? 'quota' : key.status,
      })),
    })
  }

  async function readAttachment(file?: File) {
    if (!file) return
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError('Chỉ hỗ trợ PDF, JPG, PNG hoặc WebP.')
      return
    }
    if (file.size === 0) {
      setError('Tệp đang trống. Hãy chọn tệp khác.')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('Tệp vượt quá 20 MB. Hãy giảm dung lượng hoặc chia nhỏ PDF.')
      return
    }
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      setAttachment({ data: dataUrl.split(',')[1], mimeType: file.type, name: file.name, size: file.size })
      setError('')
    } catch {
      setError('Không thể đọc tệp. Hãy thử chọn lại.')
    }
  }

  async function extract() {
    if (!settings.keys.some((key) => key.enabled)) { setError('Hãy thêm và bật ít nhất một Gemini API key.'); return }
    if (!source.trim() && !attachment) { setError('Hãy dán nội dung hoặc chọn tệp đề thi.'); return }
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await extractExamWithGemini({ ...settings, text: source, attachment })
      applyResult(result)
      setPreview(result.data)
      const draft: ImportedDraft = { id: crypto.randomUUID(), payload: result.data, createdAt: new Date().toISOString(), status: 'draft' }
      await indexedDbRepositories.drafts.save(draft)
    } catch (cause) {
      applyPoolError(cause)
      setError(cause instanceof Error ? `Không thể phân tích: ${cause.message}` : 'Không thể phân tích đề. Hãy thử lại.')
    } finally { setBusy(false) }
  }

  async function publish() {
    if (!preview) return
    const questions = preview.questions.map((item) => ({ ...item, id: crypto.randomUUID() }))
    await indexedDbRepositories.quizzes.saveExam({ id: crypto.randomUUID(), title: preview.title, description: preview.description, durationMinutes: preview.durationMinutes, questionIds: questions.map((item) => item.id), status: 'published', createdAt: new Date().toISOString() }, questions)
    setPreview(null); setSource(''); setAttachment(undefined)
  }

  return (
    <div className="flex flex-col gap-5">
      <div><p className="text-sm font-medium text-primary">Gemini BYOK</p><h1 className="text-balance font-serif text-3xl">Phòng công cụ AI</h1><p className="mt-1 max-w-2xl text-pretty leading-6 text-muted-foreground">Chọn mô hình, quản lý kho key và tự chuyển key khi chạm hạn mức.</p></div>
      <GeminiSettingsCard settings={settings} onChange={updateSettings} />
      {notice && <Alert><AlertTitle>Đã chuyển API key</AlertTitle><AlertDescription>{notice}</AlertDescription></Alert>}
      <Tabs defaultValue="importer">
        <TabsList><TabsTrigger value="importer"><FileUp data-icon="inline-start" /> Nhập đề</TabsTrigger><TabsTrigger value="tutor"><Bot data-icon="inline-start" /> Gia sư</TabsTrigger></TabsList>
        <TabsContent value="importer" className="pt-2"><Importer source={source} setSource={setSource} readAttachment={readAttachment} attachment={attachment} removeAttachment={() => setAttachment(undefined)} extract={extract} busy={busy} error={error} preview={preview} publish={publish} draftsCount={drafts.length} /></TabsContent>
        <TabsContent value="tutor" className="pt-2"><Tutor settings={settings} onResult={applyResult} onPoolError={applyPoolError} /></TabsContent>
      </Tabs>
    </div>
  )
}

function Importer({ source, setSource, readAttachment, attachment, removeAttachment, extract, busy, error, preview, publish, draftsCount }: {
  source: string
  setSource: (value: string) => void
  readAttachment: (file?: File) => void
  attachment?: Attachment
  removeAttachment: () => void
  extract: () => void
  busy: boolean
  error: string
  preview: ImportedExam | null
  publish: () => void
  draftsCount: number
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader><CardAction><Badge variant="outline">{draftsCount} bản nháp</Badge></CardAction><CardTitle>Nguồn đề thi</CardTitle><CardDescription>Dán văn bản hoặc tải PDF/ảnh. AI không tự động xuất bản.</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Textarea value={source} onChange={(event) => setSource(event.target.value)} placeholder="Dán câu hỏi, đáp án và lời giải tại đây..." className="min-h-48" />
          {attachment ? (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
              <FileText aria-hidden="true" className="shrink-0 text-primary" />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{attachment.name}</p><p className="text-xs text-muted-foreground">{attachment.mimeType === 'application/pdf' ? 'Tài liệu PDF' : 'Ảnh đề thi'} · {formatBytes(attachment.size)}</p></div>
              <Button type="button" variant="ghost" size="icon-sm" onClick={removeAttachment} aria-label={`Xóa tệp ${attachment.name}`}><X /></Button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground hover:bg-muted"><FileUp aria-hidden="true" /> Chọn PDF, JPG, PNG hoặc WebP (tối đa 20 MB)<Input className="sr-only" type="file" accept="application/pdf,image/png,image/jpeg,image/webp,.pdf" onChange={(event) => { readAttachment(event.target.files?.[0]); event.currentTarget.value = '' }} /></label>
          )}
          {error && <Alert variant="destructive"><AlertTitle>Phân tích chưa hoàn tất</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
        </CardContent>
        <CardFooter><Button onClick={extract} disabled={busy}>{busy ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Sparkles data-icon="inline-start" />} Phân tích bằng Gemini</Button></CardFooter>
      </Card>
      <Card>
        <CardHeader><CardTitle>Bản kiểm duyệt</CardTitle><CardDescription>Kiểm tra taxonomy, đáp án và lời giải trước khi lưu.</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-3">
          {preview ? <>{preview.warnings.length > 0 && <Alert><AlertTitle>Cần kiểm tra</AlertTitle><AlertDescription>{preview.warnings.join(' · ')}</AlertDescription></Alert>}<div><h3 className="font-serif text-xl">{preview.title}</h3><p className="text-muted-foreground">{preview.questions.length} câu · {preview.durationMinutes} phút</p></div>{preview.questions.slice(0, 4).map((question, index) => <div key={`${question.stem}-${index}`} className="rounded-lg border p-3"><div className="mb-2 flex flex-wrap gap-2"><Badge variant="secondary">{question.subject}</Badge><Badge variant="outline">{question.difficulty}</Badge></div><p className="line-clamp-2 text-sm">{question.stem}</p></div>)}</> : <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-center text-muted-foreground"><Sparkles aria-hidden="true" className="text-primary" /><p className="max-w-sm text-pretty">Kết quả có cấu trúc sẽ xuất hiện ở đây để bạn duyệt.</p></div>}
        </CardContent>
        {preview && <CardFooter><Button onClick={publish}>Duyệt và lưu ngân hàng</Button></CardFooter>}
      </Card>
    </div>
  )
}

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function Tutor({ settings, onResult, onPoolError }: { settings: GeminiSettings; onResult: (result: GeminiResult<string>) => void; onPoolError: (error: unknown) => void }) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  async function send() {
    if (!question.trim() || !settings.keys.some((key) => key.enabled)) return
    setBusy(true)
    try {
      const result = await askTutor({ ...settings, question, context: 'Người học đang luyện TSA, ưu tiên phương pháp giải và kỹ năng suy luận thay vì học thuộc đáp án.' })
      onResult(result)
      setAnswer(result.data)
    } catch (cause) {
      onPoolError(cause)
      setAnswer(cause instanceof Error ? cause.message : 'Không thể kết nối Gemini. Hãy thử lại.')
    } finally { setBusy(false) }
  }
  return <Card><CardHeader><CardTitle>Gia sư gợi ý từng bước</CardTitle><CardDescription>Dùng chung mô hình và kho key phía trên.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3">{answer && <div className="rounded-xl bg-muted p-4 leading-6"><p className="mb-1 text-xs font-medium text-primary">GIA SƯ TSA</p>{answer}</div>}<Textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); send() } }} placeholder="Ví dụ: Vì sao phải xét dấu đạo hàm ở câu này?" /><Button className="self-end" onClick={send} disabled={!settings.keys.some((key) => key.enabled) || busy}>{busy ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Send data-icon="inline-start" />} Gửi câu hỏi</Button></CardContent></Card>
}
