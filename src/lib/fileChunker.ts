export const MAX_CHUNK_BYTES = 20 * 1024 * 1024;

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function splitByBoundary(text: string, boundary: RegExp): string[] {
  return text
    .split(boundary)
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitOversizedBlock(block: string): string[] {
  if (byteLength(block) <= MAX_CHUNK_BYTES) return [block];

  const paragraphs = splitByBoundary(block, /\n\s*\n+/);
  if (paragraphs.length > 1) return packUnits(paragraphs);

  const sentences = splitByBoundary(block, /(?<=[.!?。！？])\s+/);
  if (sentences.length > 1) return packUnits(sentences);

  const result: string[] = [];
  let remaining = block;

  while (remaining.length > 0) {
    let end = Math.min(
      remaining.length,
      Math.floor(
        remaining.length * (MAX_CHUNK_BYTES / byteLength(remaining)),
      ),
    );

    end = Math.max(1, end);

    while (
      end > 1 &&
      byteLength(remaining.slice(0, end)) > MAX_CHUNK_BYTES
    ) {
      end -= 1;
    }

    result.push(remaining.slice(0, end).trim());
    remaining = remaining.slice(end).trim();
  }

  return result.filter(Boolean);
}

function packUnits(units: string[]): string[] {
  const chunks: string[] = [];
  let current = '';

  for (const unit of units) {
    const candidate = current ? `${current}\n\n${unit}` : unit;

    if (current && byteLength(candidate) > MAX_CHUNK_BYTES) {
      chunks.push(current);
      current = unit;
    } else {
      current = candidate;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.flatMap((chunk) => splitOversizedBlock(chunk));
}

export function splitTextIntoChunks(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();

  if (!normalized) {
    return [];
  }

  const questionUnits = splitByBoundary(
    normalized,
    /(?=^\s*(?:Câu|Bài|Question|Problem)\s*\d+\s*[:.)-]?)/gim,
  );

  const sourceUnits =
    questionUnits.length > 1
      ? questionUnits
      : splitByBoundary(normalized, /\n\s*\n+/);

  return packUnits(sourceUnits.length > 0 ? sourceUnits : [normalized]);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
