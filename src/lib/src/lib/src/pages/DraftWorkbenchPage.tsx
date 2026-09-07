import {
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import {
  Bot,
  Check,
  CheckCircle2,
  CircleAlert,
  FilePlus2,
  FileText,
  Filter,
  Gauge,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload,
} from 'lucide-react';
import { FloatingAgentChat } from '@/components/blocks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useLiveNodes } from '@/hooks/use-live-nodes';
import {
  createNode,
  getFieldValue,
  getTitle,
  updateNode,
} from '@/lib/genesis-data';
import {
  runWithRepair,
  type PipelineStage,
} from '@/lib/gemini';
import {
  formatFileSize,
  splitTextIntoChunks,
} from '@/lib/fileChunker';
import { saveApprovedQuestion } from '@/lib/approved-questions-db';

const REVIEW_QUEUE_ID = 'kCfa5Rkbt1qrxq17';
const CURATOR_AGENT_ID = '01M1NZ7TYJY9DRDR9ZP6THPBYT';

const DIFFICULTIES = [
  'Nhận biết',
  'Thông hiểu',
  'Vận dụng thấp',
  'Vận dụng',
  'Vận dụng cao',
  'Bài toán tư duy',
];

type PipelineState =
  | 'idle'
  | 'splitting'
  | 'generator'
  | 'auditor'
  | 'done'
  | 'error';

type PipelineResultRow = {
  index: number;
  passed: boolean;
  reason: string;
};

function stageLabel(
  state: PipelineState,
  processed: number,
  total: number,
): string {
  if (state === 'splitting') {
    return '🟡 Đang phân tách dữ liệu file...';
  }

  if (state === 'generator') {
    return `🔵 AI 1: Đang khởi tạo câu hỏi (${processed + 1}/${total})...`;
  }

  if (state === 'auditor') {
    return `🟣 AI 2: Đang thẩm định chuẩn TSA (${processed + 1}/${total})...`;
  }

  if (state === 'done') {
    return `🟢 Hoàn tất! Đã chuyển ${processed} bài vào danh sách chờ duyệt.`;
  }

  if (state === 'error') {
    return '🔴 Luồng xử lý dừng lại, cần kiểm tra thông báo.';
  }

  return 'Chọn file để bắt đầu pipeline Generator → Auditor.';
}

function statusIcon(status: PipelineState) {
  if (status === 'done') {
    return (
      <CheckCircle2 className="size-5 text-emerald-500" />
    );
  }

  if (status === 'error') {
    return (
      <CircleAlert className="size-5 text-destructive" />
    );
  }

  if (status === 'idle') {
    return (
      <Gauge className="size-5 text-muted-foreground" />
    );
  }

  return (
    <Loader2 className="size-5 animate-spin text-primary" />
  );
}

export default function DraftWorkbenchPage() {
  const {
    nodes,
    loading,
    error,
    refresh,
  } = useLiveNodes(REVIEW_QUEUE_ID);

  const [source, setSource] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [explanation, setExplanation] = useState('');
  const [difficulty, setDifficulty] = useState('Vận dụng');
  const [topic, setTopic] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);
  const [pipelineState, setPipelineState] =
    useState<PipelineState>('idle');
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [pipelineResults, setPipelineResults] =
    useState<PipelineResultRow[]>([]);

  const visibleNodes = useMemo(() => {
    if (filter === 'all') {
      return nodes;
    }

    return nodes.filter(
      (node) =>
        getFieldValue(node, 'Review Status') === filter,
    );
  }, [filter, nodes]);

  const progressPercent =
    total > 0 ? Math.round((processed / total) * 100) : 0;

  const hasProgress = total > 0;

  const isProcessing =
    pipelineState === 'splitting' ||
    pipelineState === 'generator' ||
    pipelineState === 'auditor';

  const hasPipelineError = pipelineState === 'error';

  async function saveDraft(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!question.trim()) {
      return;
    }

    setSaving(true);
    setNotice('');

    try {
      const result = await createNode(REVIEW_QUEUE_ID, {
        '/text': question.trim(),
        'Original Text': source.trim() || question.trim(),
        'Transformed Question': question.trim(),
        'Correct Answer':
          answer.trim() || 'Chưa xác định',
        'Explanation':
          explanation.trim() ||
          'Cần biên tập viên bổ sung lời giải.',
        'Taxonomy Topics':
          topic.trim() || 'Chưa gắn chủ đề',
        'Difficulty Level': difficulty,
        'Review Status': 'Draft',
        Source:
          source.trim() ||
          'Tạo trực tiếp trong workspace',
      });

      if (result.ignoredKeys?.length) {
        throw new Error(
          `Thiếu trường dữ liệu: ${result.ignoredKeys.join(', ')}`,
        );
      }

      setSource('');
      setQuestion('');
      setAnswer('');
      setExplanation('');
      setTopic('');
      setNotice(
        'Bản nháp đã được đưa vào hàng đợi kiểm duyệt.',
      );

      await refresh();
    } catch (cause) {
      setNotice(
        cause instanceof Error
          ? cause.message
          : 'Không thể lưu bản nháp.',
      );
    } finally {
      setSaving(false);
    }
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    setSelectedFile(event.target.files?.[0] ?? null);
    setPipelineState('idle');
    setPipelineResults([]);
    setProcessed(0);
    setTotal(0);
    setNotice('');
  }

  async function processFile() {
    if (!selectedFile || isProcessing) {
      return;
    }

    setPipelineState('splitting');
    setProcessed(0);
    setTotal(0);
    setPipelineResults([]);
    setNotice('');

    try {
      const text = await selectedFile.text();

      if (
        selectedFile.type === 'application/pdf' ||
        text.startsWith('%PDF-')
      ) {
        throw new Error(
          'File PDF cần được chuyển sang văn bản trước khi chạy pipeline. Hãy dùng TXT, MD, CSV hoặc JSON để giữ cấu trúc câu hỏi chính xác.',
        );
      }

      const chunks = splitTextIntoChunks(text);

      if (chunks.length === 0) {
        throw new Error(
          'File không có nội dung văn bản để xử lý.',
        );
      }

      setTotal(chunks.length);

      for (
        let index = 0;
        index < chunks.length;
        index += 1
      ) {
        const chunk = chunks[index];

        const result = await runWithRepair(
          chunk,
          (stage: PipelineStage) => {
            setPipelineState(stage);
          },
        );

        const passed = result.audit.passed;
        const generated = result.generated;

        const auditReason =
          result.audit.reasons ||
          (passed
            ? 'Đạt kiểm tra TSA.'
            : 'Auditor yêu cầu kiểm tra thủ công.');

        const finalStatus = passed
          ? 'Draft'
          : 'In Review';

        const auditNote = passed
          ? `AI 2 Auditor: Đạt sau ${result.attempts} lượt.`
          : `⚠️ Auditor flag: ${auditReason}`;

        const writeResult = await createNode(
          REVIEW_QUEUE_ID,
          {
            '/text': generated.transformedQuestion,
            'Original Text':
              generated.originalText || chunk,
            'Transformed Question':
              generated.transformedQuestion,
            'Options JSON': generated.optionsJson,
            'Correct Answer': generated.correctAnswer,
            Explanation: generated.explanation,
            'SVG Graph': generated.svgGraph,
            'Taxonomy Topics':
              generated.taxonomyTopics,
            'Difficulty Level': DIFFICULTIES.includes(
              generated.difficultyLevel,
            )
              ? generated.difficultyLevel
              : 'Vận dụng',
            'Review Status': finalStatus,
            Source: `${selectedFile.name} · chunk ${
              index + 1
            }/${chunks.length}`,
            '/attributes/note': auditNote,
          },
        );

        if (writeResult.ignoredKeys?.length) {
          throw new Error(
            `Không ghi được các trường: ${writeResult.ignoredKeys.join(', ')}`,
          );
        }

        setPipelineResults((current) => [
          ...current,
          {
            index: index + 1,
            passed,
            reason: auditReason,
          },
        ]);

        setProcessed(index + 1);
      }

      setPipelineState('done');
      setNotice(
        `Đã xử lý ${chunks.length} bài và chuyển kết quả vào Review Queue.`,
      );

      await refresh();
    } catch (cause) {
      setPipelineState('error');
      setNotice(
        cause instanceof Error
          ? cause.message
          : 'Không thể xử lý file.',
      );
    }
  }

  async function approve(nodeId: string) {
    try {
      await updateNode(REVIEW_QUEUE_ID, nodeId, {
        'Review Status': 'Approved',
      });

      const approvedNode = nodes.find(
        (node) => node.id === nodeId,
      );

      if (approvedNode) {
        await saveApprovedQuestion({
          id: approvedNode.id,
          title:
            getTitle(
              approvedNode,
              'Transformed Question',
              'Original Text',
            ) || 'Bản nháp chưa có tiêu đề',
          answer:
            getFieldValue(
              approvedNode,
              'Correct Answer',
            ) || 'Chưa xác định',
          explanation:
            getFieldValue(
              approvedNode,
              'Explanation',
            ) || 'Chưa có lời giải',
          topics:
            getFieldValue(
              approvedNode,
              'Taxonomy Topics',
            ) || 'Chưa gắn chủ đề',
          difficulty:
            getFieldValue(
              approvedNode,
              'Difficulty Level',
            ) || 'Vận dụng',
          approvedAt: new Date().toISOString(),
        });
      }

      setNotice(
        'Đã phê duyệt và lưu bản chính thức vào IndexedDB.',
      );

      await refresh();
    } catch (cause) {
      setNotice(
        cause instanceof Error
          ? cause.message
          : 'Không thể phê duyệt bản nháp.',
      );
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">
            TSA Focus · AI verification workspace
          </p>

          <h1 className="text-3xl font-semibold tracking-tight">
            Biên tập bản nháp
          </h1>

          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Tải file lớn, cắt theo ranh giới câu hỏi, chạy Generator và Auditor, rồi giữ phê duyệt cuối cùng cho con người.
          </p>
        </div>

        <Badge variant="outline">
          {nodes.length} bản ghi trong hàng đợi
        </Badge>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-start gap-3 p-4">
            <FileText className="mt-0.5 size-5 text-primary" />

            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Chunk an toàn
              </p>

              <p className="mt-1 font-semibold">
                ≤ 20MB / phần
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Ưu tiên ranh giới Câu, Bài và đoạn văn.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-sky-500/20 bg-sky-500/5">
          <CardContent className="flex items-start gap-3 p-4">
            <Bot className="mt-0.5 size-5 text-sky-500" />

            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Hai AI nối tiếp
              </p>

              <p className="mt-1 font-semibold">
                Generator → Auditor
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Auditor fail sẽ kích hoạt một lượt sửa.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="flex items-start gap-3 p-4">
            <ShieldCheck className="mt-0.5 size-5 text-emerald-500" />

            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Human-in-the-loop
              </p>

              <p className="mt-1 font-semibold">
                Người dùng duyệt cuối
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                AI không tự chuyển bài thành Approved.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="size-5 text-primary" />
                Xử lý file lớn
              </CardTitle>

              <CardDescription>
                Hỗ trợ TXT, MD, CSV và JSON. File được chia theo cấu trúc câu hỏi, không cắt giữa các đoạn hợp lệ.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="source-file">
                  File dữ liệu hoặc đề thi
                </Label>

                <Input
                  id="source-file"
                  type="file"
                  accept=".txt,.md,.csv,.json,text/plain,text/markdown,text/csv,application/json"
                  onChange={handleFileChange}
                  disabled={isProcessing}
                />
              </div>

              {selectedFile && (
                <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="size-4 shrink-0 text-primary" />

                    <span className="truncate">
                      {selectedFile.name}
                    </span>
                  </div>

                  <Badge variant="secondary">
                    {formatFileSize(selectedFile.size)}
                  </Badge>
                </div>
              )}

              <Button
                type="button"
                onClick={() => void processFile()}
                disabled={!selectedFile || isProcessing}
                className="w-full"
              >
                <Sparkles data-icon="inline-start" />

                {isProcessing
                  ? 'Đang chạy pipeline...'
                  : 'Chạy Generator → Auditor'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FilePlus2 className="size-5 text-primary" />
                Tạo một bản nháp
              </CardTitle>

              <CardDescription>
                Luồng thủ công vẫn được giữ để biên tập viên nhập nhanh một câu.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form
                className="flex flex-col gap-4"
                onSubmit={saveDraft}
              >
                <div className="grid gap-2">
                  <Label htmlFor="source">
                    Nguồn đề
                  </Label>

                  <Input
                    id="source"
                    value={source}
                    onChange={(event) =>
                      setSource(event.target.value)
                    }
                    placeholder="Ví dụ: Đề TSA 2026, trang 4"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="question">
                    Nội dung câu hỏi
                  </Label>

                  <Textarea
                    id="question"
                    value={question}
                    onChange={(event) =>
                      setQuestion(event.target.value)
                    }
                    placeholder="Dán hoặc viết câu hỏi cần biên tập..."
                    className="min-h-28"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="answer">
                    Đáp án đúng
                  </Label>

                  <Input
                    id="answer"
                    value={answer}
                    onChange={(event) =>
                      setAnswer(event.target.value)
                    }
                    placeholder="Ví dụ: B hoặc 12"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="explanation">
                    Lời giải
                  </Label>

                  <Textarea
                    id="explanation"
                    value={explanation}
                    onChange={(event) =>
                      setExplanation(event.target.value)
                    }
                    placeholder="Giải thích ngắn gọn..."
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="topic">
                      Chủ đề
                    </Label>

                    <Input
                      id="topic"
                      value={topic}
                      onChange={(event) =>
                        setTopic(event.target.value)
                      }
                      placeholder="Ví dụ: Hàm số"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>
                      Độ khó
                    </Label>

                    <Select
                      value={difficulty}
                      onValueChange={(value) =>
                        value && setDifficulty(value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        {DIFFICULTIES.map((item) => (
                          <SelectItem
                            key={item}
                            value={item}
                          >
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={saving || !question.trim()}
                >
                  {saving ? (
                    'Đang lưu...'
                  ) : (
                    <>
                      <FilePlus2 data-icon="inline-start" />
                      Lưu bản nháp
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-muted/20">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {statusIcon(pipelineState)}
                    Progress tracker
                  </CardTitle>

                  <CardDescription className="mt-2">
                    {stageLabel(
                      pipelineState,
                      processed,
                      total,
                    )}
                  </CardDescription>
                </div>

                {hasProgress && (
                  <span className="text-2xl font-semibold tabular-nums text-primary">
                    {progressPercent}%
                  </span>
                )}
              </div>

              {hasProgress && (
                <Progress
                  value={progressPercent}
                  className="mt-4 h-2"
                />
              )}
            </CardHeader>

            <CardContent className="p-4">
              {hasProgress ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">
                      Đã xử lý
                    </p>

                    <p className="mt-1 text-xl font-semibold tabular-nums">
                      {processed} / {total}
                    </p>
                  </div>

                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">
                      Đạt Auditor
                    </p>

                    <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-500">
                      {
                        pipelineResults.filter(
                          (item) => item.passed,
                        ).length
                      }
                    </p>
                  </div>

                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">
                      Có flag
                    </p>

                    <p className="mt-1 text-xl font-semibold tabular-nums text-amber-500">
                      {
                        pipelineResults.filter(
                          (item) => !item.passed,
                        ).length
                      }
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Chưa có phiên xử lý. Chọn một file để theo dõi từng phần.
                </p>
              )}

              {pipelineResults.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  {pipelineResults.slice(-4).map((item) => (
                    <div
                      key={item.index}
                      className="flex items-start gap-2 rounded-lg border p-3 text-sm"
                    >
                      {item.passed ? (
                        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                      ) : (
                        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
                      )}

                      <span>
                        Chunk {item.index}:{' '}
                        {item.passed
                          ? 'Đạt, đã đưa vào Draft.'
                          : item.reason}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {notice && (
            <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-primary" />

              <span>{notice}</span>
            </div>
          )}

          {hasPipelineError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              Có thể chọn lại file và chạy lại. Các chunk đã ghi thành công vẫn giữ nguyên trong Review Queue.
            </div>
          )}

          <Card>
            <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>
                  Hàng đợi kiểm duyệt
                </CardTitle>

                <CardDescription>
                  Chỉ bài đạt AI 2 mới vào Draft. Bài có flag được giữ ở In Review để kiểm tra.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Filter
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />

                <Select
                  value={filter}
                  onValueChange={(value) =>
                    value && setFilter(value)
                  }
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">
                      Tất cả
                    </SelectItem>

                    <SelectItem value="Draft">
                      Sẵn sàng duyệt
                    </SelectItem>

                    <SelectItem value="In Review">
                      Có flag
                    </SelectItem>

                    <SelectItem value="Approved">
                      Đã phê duyệt
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-3">
              {loading && (
                <p className="text-sm text-muted-foreground">
                  Đang tải hàng đợi...
                </p>
              )}

              {error && (
                <p className="text-sm text-destructive">
                  Không thể tải hàng đợi: {error.message}
                </p>
              )}

              {!loading &&
                !error &&
                visibleNodes.length === 0 && (
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Chưa có bản nháp phù hợp.
                  </div>
                )}

              {visibleNodes.map((node) => {
                const status =
                  getFieldValue(
                    node,
                    'Review Status',
                  ) || 'Draft';

                const hasFlag = status === 'In Review';
                const hasSvg = Boolean(
                  getFieldValue(node, 'SVG Graph'),
                );

                return (
                  <article
                    key={node.id}
                    className="rounded-xl border p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="line-clamp-2 font-medium">
                          {getTitle(
                            node,
                            'Transformed Question',
                            'Original Text',
                          ) || 'Bản nháp chưa có tiêu đề'}
                        </h2>

                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {getFieldValue(
                            node,
                            'Explanation',
                          ) || 'Chưa có lời giải'}
                        </p>
                      </div>

                      <Badge
                        variant={
                          status === 'Approved'
                            ? 'secondary'
                            : hasFlag
                              ? 'destructive'
                              : 'outline'
                        }
                      >
                        {hasFlag
                          ? 'Flag cần kiểm tra'
                          : status === 'Draft'
                            ? 'Sẵn sàng duyệt'
                            : status}
                      </Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>
                        {getFieldValue(
                          node,
                          'Taxonomy Topics',
                        ) || 'Chưa gắn chủ đề'}
                      </span>

                      <span>·</span>

                      <span>
                        {getFieldValue(
                          node,
                          'Difficulty Level',
                        ) || 'Chưa gắn độ khó'}
                      </span>

                      {hasSvg && (
                        <>
                          <span>·</span>
                          <span>SVG đã sinh</span>
                        </>
                      )}
                    </div>

                    {status !== 'Approved' && (
                      <div className="mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void approve(node.id)
                          }
                        >
                          <Check data-icon="inline-start" />
                          Phê duyệt chính thức
                        </Button>
                      </div>
                    )}
                  </article>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </section>

      <FloatingAgentChat agentId={CURATOR_AGENT_ID} />
    </main>
  );
}
