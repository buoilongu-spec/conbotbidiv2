import { useMemo, useState } from 'react';
import { Check, CircleAlert, FilePlus2, Filter, Sparkles } from 'lucide-react';
import { FloatingAgentChat } from '@/components/blocks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useLiveNodes } from '@/hooks/use-live-nodes';
import { createNode, getFieldValue, getTitle, updateNode } from '@/lib/genesis-data';

const REVIEW_QUEUE_ID = 'kCfa5Rkbt1qrxq17';
const CURATOR_AGENT_ID = '01M1NZ7TYJY9DRDR9ZP6THPBYT';
const DIFFICULTIES = ['Nhận biết', 'Thông hiểu', 'Vận dụng thấp', 'Vận dụng', 'Vận dụng cao', 'Bài toán tư duy'];

export default function DraftWorkbenchPage() {
  const { nodes, loading, error, refresh } = useLiveNodes(REVIEW_QUEUE_ID);
  const [source, setSource] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [explanation, setExplanation] = useState('');
  const [difficulty, setDifficulty] = useState('Vận dụng');
  const [topic, setTopic] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState('all');

  const visibleNodes = useMemo(() => {
    if (filter === 'all') return nodes;
    return nodes.filter((node) => getFieldValue(node, 'Review Status') === filter);
  }, [filter, nodes]);

  async function saveDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim()) return;
    setSaving(true);
    setNotice('');
    try {
      const result = await createNode(REVIEW_QUEUE_ID, {
        '/text': question.trim(),
        'Original Text': source.trim() || question.trim(),
        'Transformed Question': question.trim(),
        'Correct Answer': answer.trim() || 'Chưa xác định',
        'Explanation': explanation.trim() || 'Cần biên tập viên bổ sung lời giải.',
        'Taxonomy Topics': topic.trim() || 'Chưa gắn chủ đề',
        'Difficulty Level': difficulty,
        'Review Status': 'Draft',
        Source: source.trim() || 'Tạo trực tiếp trong workspace',
      });
      if (result.ignoredKeys?.length) throw new Error(`Thiếu trường dữ liệu: ${result.ignoredKeys.join(', ')}`);
      setSource('');
      setQuestion('');
      setAnswer('');
      setExplanation('');
      setTopic('');
      setNotice('Bản nháp đã được đưa vào hàng đợi kiểm duyệt.');
      await refresh();
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Không thể lưu bản nháp.');
    } finally {
      setSaving(false);
    }
  }

  async function approve(nodeId: string) {
    await updateNode(REVIEW_QUEUE_ID, nodeId, { 'Review Status': 'Approved' });
    await refresh();
  }

  return (
            <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
      main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
                    <p className="text-sm font-medium text-primary">TSA Focus · mở rộng</p>
          rộng</p>
          rộng</p>
          rộng</p>
          <h1 className="text-3xl font-semibold tracking-tight">Biên tập bản nháp</h1>
                                                  <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Tạo, rà soát và duyệt câu hỏi mà không thay đổi không gian học tập chính.</p>
        </div>
                <Badge variant="outline">{nodes.length} bản ghi trong hàng đợi</Badge>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader>
                                                <CardTitle className="flex items-center gap-2">CardTitle className="flex items-center gap-2"><FilePlus2 className="size-5 text-primary" />Tạo bản nháp</CardTitle>
            <CardDescription>Nội dung được lưu trực tiếp vào Review Queue với trạng thái Draft.</CardDescription>
          </CardHeader>
          <CardContent>
                                    <form className="flex flex-col gap-4" onSubmit={saveDraft}>
                            <div className="grid gap-2"><Label htmlFor="source">Nguồn đề</Label>Label htmlFor="source">Nguồn đề</Label>Label htmlFor="source">Nguồn đề</Label>Label htmlFor="source">Nguồn đề</Label><Input id="source" value={source} onChange={(event) => setSource(event.target.value)} placeholder="Ví dụ: Đề TSA 2026, trang 4" /></div>
                            <div className="grid gap-2">div className="grid gap-2"><Label htmlFor="question">Nội dung câu hỏi</Label>Label htmlFor="question">Nội dung câu hỏi</Label>Label htmlFor="question">Nội dung câu hỏi</Label>Label htmlFor="question">Nội dung câu hỏi</Label>Label htmlFor="question">Nội dung câu hỏi</Label><Textarea id="question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Dán hoặc viết câu hỏi cần biên tập..." className="min-h-36" required /></div>
                            <div className="grid gap-2"><Label htmlFor="answer">Đáp án đúng</Label>đúng</Label>đúng</Label>đúng</Label>đúng</Label><Input id="answer" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Ví dụ: B hoặc 12" /></div>
              <div className="grid gap-2"><Label htmlFor="explanation">Lời giải</Label>Label htmlFor="explanation">Lời giải</Label>Label htmlFor="explanation">Lời giải</Label><Textarea id="explanation" value={explanation} onChange={(event) => setExplanation(event.target.value)} placeholder="Giải thích ngắn gọn, có thể bổ sung sau..." /></div>
              <div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="topic">Chủ đề</Label>đề</Label>đề</Label>đề</Label><Input id="topic" value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Ví dụ: Hàm số" /></div>/></div>/></div><div className="grid gap-2"><Label>Độ khó</Label>khó</Label>khó</Label><Select value={difficulty} onValueChange={(value) => value && setDifficulty(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DIFFICULTIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div></div>
              {notice && <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm">div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm">div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm">div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm"><CircleAlert className="mt-0.5 size-4 shrink-0 text-primary" /><span>{notice}</span></div>}
                                                                      <Button type="submit" disabled={saving || !question.trim()}>{saving ? 'Đang lưu...' : <>>><Sparkles data-icon="inline-start" /> Lưu bản nháp</>}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
                                        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle>Hàng đợi kiểm duyệt</CardTitle><CardDescription>Đọc dữ liệu thật từ Review Queue.</CardDescription></div>từ Review Queue.</CardDescription></div>từ Review Queue.</CardDescription></div><div className="flex items-center gap-2">div className="flex items-center gap-2">div className="flex items-center gap-2"><Filter className="size-4 text-muted-foreground" aria-hidden="true" />Filter className="size-4 text-muted-foreground" aria-hidden="true" />Filter className="size-4 text-muted-foreground" aria-hidden="true" /><Select value={filter} onValueChange={(value) => value && setFilter(value)}>&& setFilter(value)}><SelectTrigger className="w-36">SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>SelectContent><SelectItem value="all">Tất cả</SelectItem>cả</SelectItem><SelectItem value="Draft">Draft</SelectItem>SelectItem value="Draft">Draft</SelectItem><SelectItem value="In Review">In Review</SelectItem>Review</SelectItem><SelectItem value="Approved">Approved</SelectItem></SelectContent></Select></div></CardHeader>
                                        <CardContent className="flex flex-col gap-3">
            {loading && <p className="text-sm text-muted-foreground">Đang tải hàng đợi...</p>}
            {error && <p className="text-sm text-destructive">Không thể tải hàng đợi: {error.message}</p>}
            {!loading && !error && visibleNodes.length === 0 && <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Chưa có bản nháp phù hợp.</div>}
            {visibleNodes.map((node) => { const status = getFieldValue(node, 'Review Status') || 'Draft'; return 'Draft'; return <article key={node.id} className="rounded-xl border p-4">article key={node.id} className="rounded-xl border p-4">article key={node.id} className="rounded-xl border p-4">article key={node.id} className="rounded-xl border p-4">article key={node.id} className="rounded-xl border p-4"><div className="flex items-start justify-between gap-3">div className="flex items-start justify-between gap-3"><div className="min-w-0">div className="min-w-0">div className="min-w-0"><h2 className="line-clamp-2 font-medium">{getTitle(node, 'Transformed Question', 'Original Text') || 'Bản nháp chưa có tiêu đề'}</h2>tiêu đề'}</h2>tiêu đề'}</h2>tiêu đề'}</h2><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{getFieldValue(node, 'Explanation') || 'Chưa có lời giải'}</p></div>lời giải'}</p></div>lời giải'}</p></div>lời giải'}</p></div>lời giải'}</p></div>lời giải'}</p></div><Badge variant={status === 'Approved' ? 'secondary' : 'outline'}>{status}</Badge></div>Badge variant={status === 'Approved' ? 'secondary' : 'outline'}>{status}</Badge></div>Badge variant={status === 'Approved' ? 'secondary' : 'outline'}>{status}</Badge></div>Badge variant={status === 'Approved' ? 'secondary' : 'outline'}>{status}</Badge></div>Badge variant={status === 'Approved' ? 'secondary' : 'outline'}>{status}</Badge></div>Badge variant={status === 'Approved' ? 'secondary' : 'outline'}>{status}</Badge></div><div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground"><span>{getFieldValue(node, 'Taxonomy Topics') || 'Chưa gắn chủ đề'}</span><span>·</span><span>{getFieldValue(node, 'Difficulty Level') || 'Chưa gắn độ khó'}</span></div>{status !== 'Approved' && <div className="mt-3">div className="mt-3">div className="mt-3"><Button size="sm" variant="outline" onClick={() => approve(node.id)}>approve(node.id)}>approve(node.id)}><Check data-icon="inline-start" /> Duyệt bản nháp</Button></div>}</article> })}
          </CardContent>
        </Card>
      </section>

              </Card>
      </section>

              </Card>
      </section>

      <FloatingAgentChat agentId={CURATOR_AGENT_ID} />
    </main>
  );
}
