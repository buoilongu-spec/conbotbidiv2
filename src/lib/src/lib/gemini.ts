export const TSA_GENERATOR_AGENT_ID = '01M1XP54FTT1EVCSDHC51K7EFH';
export const TSA_AUDITOR_AGENT_ID = '01M1XP54G46FBW1MBWCV4WW0B4';

export type GeneratedQuestion = {
  originalText: string;
  transformedQuestion: string;
  optionsJson: string;
  correctAnswer: string;
  explanation: string;
  svgGraph: string;
  taxonomyTopics: string;
  difficultyLevel: string;
};

export type AuditResult = {
  passed: boolean;
  reasons: string;
  correctedJson: string;
};

export type PipelineResult = {
  generated: GeneratedQuestion;
  audit: AuditResult;
  attempts: number;
};

export type PipelineStage = 'generator' | 'auditor';

export type PipelineStageCallback = (
  stage: PipelineStage,
  attempt: number,
) => void;

const MAX_RESPONSE_BYTES = 1024 * 1024;

function parseJsonObject<T>(text: string, label: string): T {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');

  if (start < 0 || end <= start) {
    throw new Error(`${label} không trả về JSON hợp lệ.`);
  }

  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    throw new Error(`${label} trả về JSON không thể phân tích.`);
  }
}

async function readAgentStream(response: Response): Promise<string> {
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Agent không phản hồi (${response.status}). ${detail.slice(0, 160)}`,
    );
  }

  if (!response.body) {
    throw new Error('Agent không trả về luồng dữ liệu.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = '';
  let output = '';

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    const frames = buffer.split(/\r\n\r\n|\n\n|\r\r/);
    buffer = frames.pop() ?? '';

    for (const frame of frames) {
      const data = frame
        .split(/\r\n|\n|\r/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n');

      if (!data || data === '[DONE]') {
        continue;
      }

      try {
        const event = JSON.parse(data) as {
          type?: string;
          delta?: string;
          errorText?: string;
        };

        if (event.type === 'text-delta' && event.delta) {
          output += event.delta;
        }

        if (event.type === 'error') {
          throw new Error(event.errorText || 'Agent gặp lỗi.');
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.message !== 'Unexpected end of JSON input'
        ) {
          throw error;
        }
      }

      if (
        new TextEncoder().encode(output).byteLength > MAX_RESPONSE_BYTES
      ) {
        throw new Error('Phản hồi AI vượt quá giới hạn an toàn.');
      }
    }
  }

  return output;
}

async function askAgent(
  agentId: string,
  prompt: string,
): Promise<string> {
  const conversationResponse = await fetch(
    `/api/taskade/agents/${agentId}/public-conversations`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'same-origin',
    },
  );

  if (!conversationResponse.ok) {
    throw new Error('Không thể khởi tạo phiên AI.');
  }

  const conversation = (await conversationResponse.json()) as {
    conversationId?: string;
  };

  if (!conversation.conversationId) {
    throw new Error('Phiên AI không có mã hội thoại.');
  }

  const response = await fetch(
    `/api/taskade/agents/${agentId}/public-conversations/${conversation.conversationId}/chat`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        messages: [
          {
            id: crypto.randomUUID(),
            role: 'user',
            content: prompt,
          },
        ],
        history: [],
      }),
    },
  );

  return readAgentStream(response);
}

function normalizeGenerated(
  value: GeneratedQuestion,
  source: string,
): GeneratedQuestion {
  return {
    originalText: String(value.originalText || source),
    transformedQuestion: String(
      value.transformedQuestion || source,
    ),
    optionsJson: String(value.optionsJson || ''),
    correctAnswer: String(
      value.correctAnswer || 'Chưa xác định',
    ),
    explanation: String(
      value.explanation || 'Chưa có lời giải.',
    ),
    svgGraph: String(value.svgGraph || ''),
    taxonomyTopics: String(
      value.taxonomyTopics || 'Chưa gắn chủ đề',
    ),
    difficultyLevel: String(
      value.difficultyLevel || 'Vận dụng',
    ),
  };
}

export async function runTwoAgentVerification(
  source: string,
  feedback = '',
  onStage?: PipelineStageCallback,
): Promise<PipelineResult> {
  const attempt = feedback ? 2 : 1;

  onStage?.('generator', attempt);

  const generatorPrompt = [
    'Tạo một câu hỏi TSA từ dữ liệu nguồn dưới đây.',
    'Chỉ trả về JSON object theo schema đã được hướng dẫn, không markdown.',
    feedback
      ? `Đây là phản hồi sửa từ Auditor, hãy khắc phục: ${feedback}`
      : '',
    `Dữ liệu nguồn:\n${source}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const generated = normalizeGenerated(
    parseJsonObject<GeneratedQuestion>(
      await askAgent(
        TSA_GENERATOR_AGENT_ID,
        generatorPrompt,
      ),
      'Generator',
    ),
    source,
  );

  onStage?.('auditor', attempt);

  const auditorPrompt = [
    'Thẩm định JSON câu hỏi TSA dưới đây.',
    'Kiểm tra logic, đáp án, lời giải, JSON, SVG, taxonomy và difficultyLevel.',
    'Chỉ trả về JSON object theo schema đã được hướng dẫn, không markdown.',
    JSON.stringify(generated),
  ].join('\n\n');

  const audit = parseJsonObject<AuditResult>(
    await askAgent(
      TSA_AUDITOR_AGENT_ID,
      auditorPrompt,
    ),
    'Auditor',
  );

  return {
    generated,
    audit,
    attempts: feedback ? 2 : 1,
  };
}

export async function runWithRepair(
  source: string,
  onStage?: PipelineStageCallback,
): Promise<PipelineResult> {
  const first = await runTwoAgentVerification(
    source,
    '',
    onStage,
  );

  if (first.audit.passed) {
    return first;
  }

  const repaired = await runTwoAgentVerification(
    source,
    first.audit.reasons,
    onStage,
  );

  return {
    generated: repaired.generated,
    audit: repaired.audit,
    attempts: 2,
  };
}
