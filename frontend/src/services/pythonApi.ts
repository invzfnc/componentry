export interface PyQuoteRequest {
  brief: string;
  budget: number;
}

export interface PyQuotePart {
  id: string;
  name: string;
  part_name?: string;
  sku?: string;
  price: number;
  category?: string;
  stock_level?: number;
  icon?: string;
  specs: Record<string, unknown>;
  reasoning: string;
  alternatives: {
    down?: { id: string; tradeoff: string } | null;
    up?: { id: string; tradeoff: string } | null;
  };
}

export interface PyQuoteResponse {
  quote_id: string;
  brief: string;
  budget: number;
  total: number;
  savings: number;
  parts: Record<string, PyQuotePart>;
  generated_at: string;
}

export interface PyStreamEvent {
  step: "filtering" | "ai" | "resolving" | "budget" | "compat" | "done" | "heartbeat" | "result" | "error";
  message?: string;
  data?: PyQuoteResponse;
}

export interface PyCompatResponse {
  compatible: boolean;
  verifier?: "rules_engine" | "ai" | string;
  summary?: string;
  checks?: Array<{
    label: string;
    status: "passed" | "failed" | "warning" | string;
    message: string;
  }>;
  errors: string[];
  warnings: string[];
}

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body.detail || body.error || `${res.status} ${res.statusText}`;
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}

export async function* streamQuote(req: PyQuoteRequest): AsyncGenerator<PyStreamEvent> {
  const res = await fetch("/api/py/quote/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!res.ok || !res.body) {
    throw new Error(`Quote stream failed: ${await readError(res)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const line = chunk.split("\n").find((entry) => entry.startsWith("data: "));
      if (line) {
        yield JSON.parse(line.slice(6)) as PyStreamEvent;
      }
    }
  }
}

export async function checkCompatibility(items: unknown[]): Promise<PyCompatResponse> {
  const res = await fetch("/api/py/compat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) {
    throw new Error(`Compatibility check failed: ${await readError(res)}`);
  }
  return res.json();
}

export async function checkHealth(): Promise<boolean> {
  try {
    return (await fetch("/api/py/health")).ok;
  } catch {
    return false;
  }
}
