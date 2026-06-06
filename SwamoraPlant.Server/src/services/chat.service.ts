/**
 * Savi chat service.
 *
 * Talks to Groq's OpenAI-compatible Chat Completions endpoint. Configurable
 * via env:
 *   GROQ_API_KEY     – required for live LLM responses
 *   GROQ_MODEL       – defaults to llama-3.3-70b-versatile (Groq Llama 3 family)
 *   GROQ_BASE_URL    – defaults to https://api.groq.com/openai/v1
 *
 * If GROQ_API_KEY is missing we degrade gracefully to a stubbed reply so the
 * UI stays functional during local dev / demos.
 */

import { randomUUID } from 'node:crypto';
import { db } from '../db/index.js';
import { chatMessages, diagnoses, farms, farmWidgets } from '../db/schema.js';
import { and, eq, desc, asc } from 'drizzle-orm';

export type Role = 'system' | 'user' | 'assistant';

export interface ChatMessageInput {
  role: Role;
  content: string;
}

export interface ChatStreamChunk {
  delta: string;
  done: boolean;
  meta?: { conversationId: string; messageId?: number };
}

const GROQ_BASE_URL =
  process.env.GROQ_BASE_URL ?? 'https://api.groq.com/openai/v1';
const GROQ_MODEL = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';

const SYSTEM_BASE = `You are Savi, a friendly Zimbabwean agriculture assistant for the SwamoraPlant app.
Be concise (3–6 sentences) and practical. Use plain language a smallholder farmer can understand.
Always prioritise advice that is safe for crops, people, and the environment.
If you suggest pesticide or fungicide dosages, add a short disclaimer:
"Verify with a local agronomist before applying."
You can recommend the user check the Map for shops carrying the suggested product, or take a fresh photo via Diagnose.`;

export interface DiagnosisContext {
  plant: string;
  label: string;
  confidence: number;
  medicine: string | null;
  summary: string;
  diseaseName?: string;
  diseaseCause?: string;
  diseaseSymptoms?: string[];
  products: Array<{ name: string; size: string; priceUsd: number }>;
  productKeywords: string[];
}

export interface FarmContext {
  name: string;
  cropType?: string | null;
  location?: string | null;
  widgets: Array<{
    type: string;
    title?: string | null;
    size: string;
    dataSource: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config: Record<string, any>;
  }>;
}

/** Build the dynamic system prompt grounded in the current diagnosis and/or farm. */
export const buildSystemPrompt = (ctx: {
  diagnosis?: DiagnosisContext;
  farm?: FarmContext;
}): string => {
  const sections: string[] = [SYSTEM_BASE];

  if (ctx.diagnosis) {
    const d = ctx.diagnosis;
    const confPct = Math.round(d.confidence * 100);
    const productLines =
      d.products.length > 0
        ? d.products
            .map(
              (p) =>
                `  • ${p.name} (${p.size}) — ~$${p.priceUsd} USD`,
            )
            .join('\n')
        : '  • (no specific products listed for this diagnosis)';

    sections.push(
      `Current diagnosis context (use this to ground every answer):
- Crop: ${d.plant}
- Disease: ${d.diseaseName ?? d.label} (${confPct}% confidence)
- Recommended treatment: ${d.medicine ?? 'None — plant looks healthy'}
- Treatment notes: ${d.summary}${
        d.diseaseCause ? `\n- Cause: ${d.diseaseCause}` : ''
      }${
        d.diseaseSymptoms && d.diseaseSymptoms.length > 0
          ? `\n- Key symptoms: ${d.diseaseSymptoms.join('; ')}`
          : ''
      }
- Locally-available products with indicative prices:
${productLines}

When the user asks about prices, products, alternatives, or where to buy, answer from the product list above. When they ask about "this disease", "the treatment", "the medicine", they mean the above. If they want to physically buy these products, suggest opening the Map page in the app to find nearby shops.`,
    );
  }

  if (ctx.farm) {
    const f = ctx.farm;
    const widgetLines =
      f.widgets.length > 0
        ? f.widgets
            .map(
              (w) =>
                `  • ${w.title ?? w.type} (type: ${w.type}, source: ${w.dataSource})`,
            )
            .join('\n')
        : '  • (no widgets configured yet)';
    sections.push(
      `Farm context the user is asking about:
- Name: ${f.name}
- Crop: ${f.cropType ?? 'unspecified'}
- Location: ${f.location ?? 'unspecified'}
- Tracked widgets / metrics on this farm:
${widgetLines}

When the user asks about "my farm", "this farm", or any metric (soil, water, weather, yield), refer to the widgets above. If a metric they ask about is not tracked yet, suggest they add the relevant widget.`,
    );
  }

  return sections.join('\n\n');
};

/** Fetch a diagnosis and convert it into a system-prompt context object. */
export const loadDiagnosisContext = async (
  userId: number,
  diagnosisId: number,
): Promise<DiagnosisContext | undefined> => {
  const rows = await db
    .select()
    .from(diagnoses)
    .where(and(eq(diagnoses.id, diagnosisId), eq(diagnoses.userId, userId)))
    .limit(1);
  const row = rows[0];
  if (!row) return undefined;
  const treatment = row.treatment as {
    summary: string;
    medicine: string | null;
    products?: Array<{ name: string; size: string; priceUsd: number }>;
    productKeywords?: string[];
  };
  const info = row.diseaseInfo as {
    name?: string;
    cause?: string;
    symptoms?: string[];
  } | null;
  return {
    plant: row.plant,
    label: row.topLabel,
    confidence: row.topConfidence,
    medicine: treatment.medicine ?? null,
    summary: treatment.summary,
    diseaseName: info?.name,
    diseaseCause: info?.cause,
    diseaseSymptoms: info?.symptoms,
    products: treatment.products ?? [],
    productKeywords: treatment.productKeywords ?? [],
  };
};

/** Fetch a farm + its widgets and shape them as a system-prompt context. */
export const loadFarmContext = async (
  userId: number,
  farmId: number,
): Promise<FarmContext | undefined> => {
  const farmRows = await db
    .select()
    .from(farms)
    .where(and(eq(farms.id, farmId), eq(farms.userId, userId)))
    .limit(1);
  const farm = farmRows[0];
  if (!farm) return undefined;
  const widgetRows = await db
    .select()
    .from(farmWidgets)
    .where(
      and(eq(farmWidgets.farmId, farmId), eq(farmWidgets.userId, userId)),
    )
    .orderBy(asc(farmWidgets.position), asc(farmWidgets.id));
  return {
    name: farm.name,
    cropType: farm.cropType,
    location: farm.location,
    widgets: widgetRows.map((w) => ({
      type: w.type,
      title: w.title,
      size: w.size,
      dataSource: w.dataSource,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config: (w.config as Record<string, any>) ?? {},
    })),
  };
};

interface GroqStreamChoiceDelta {
  content?: string;
  role?: Role;
}

interface GroqStreamChoice {
  index: number;
  delta: GroqStreamChoiceDelta;
  finish_reason: string | null;
}

interface GroqStreamChunk {
  choices?: GroqStreamChoice[];
}

/**
 * Calls Groq with streaming enabled and yields content deltas. The yielded
 * strings are already concatenated chunks of assistant text — the caller can
 * forward them over SSE to the browser.
 */
export async function* streamGroq(
  systemPrompt: string,
  messages: ChatMessageInput[],
): AsyncGenerator<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    // Stub mode — deliver a short canned reply chunk-by-chunk so the streaming
    // UX still works end-to-end without a key configured.
    yield* stubStream(messages);
    return;
  }

  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      stream: true,
      temperature: 0.4,
      max_tokens: 600,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.filter((m) => m.role !== 'system').map((m) => ({
          role: m.role,
          content: m.content,
        })),
      ],
    }),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw new Error(`Groq HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Server-Sent Events are separated by blank lines. Each event has one or
    // more `data: ...` lines.
    let sepIdx: number;
    while ((sepIdx = buffer.indexOf('\n\n')) !== -1) {
      const event = buffer.slice(0, sepIdx);
      buffer = buffer.slice(sepIdx + 2);
      for (const line of event.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') return;
        try {
          const parsed = JSON.parse(payload) as GroqStreamChunk;
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          // Ignore malformed SSE lines — Groq occasionally emits keepalives.
        }
      }
    }
  }
}

async function* stubStream(messages: ChatMessageInput[]): AsyncGenerator<string> {
  const lastUser = messages.filter((m) => m.role === 'user').at(-1)?.content ?? '';
  const reply =
    `(Demo mode — set GROQ_API_KEY to enable the live LLM.) ` +
    `You asked: "${lastUser.slice(0, 80)}". ` +
    `In live mode I'd ground my answer in your latest diagnosis and recommend a treatment plan with safe-application steps.`;
  // Pretend it streams word-by-word.
  for (const word of reply.split(/(\s+)/)) {
    yield word;
    await new Promise((r) => setTimeout(r, 18));
  }
}

/** Persist a single message row. */
export const saveMessage = async (params: {
  userId: number;
  conversationId: string;
  diagnosisId: number | null;
  role: Role;
  content: string;
}): Promise<number> => {
  const [row] = await db
    .insert(chatMessages)
    .values({
      userId: params.userId,
      conversationId: params.conversationId,
      diagnosisId: params.diagnosisId,
      role: params.role,
      content: params.content,
    })
    .returning({ id: chatMessages.id });
  return row.id;
};

/** Last N messages in a conversation, oldest-first. */
export const getConversation = async (
  userId: number,
  conversationId: string,
  limit = 50,
): Promise<Array<{ role: Role; content: string; createdAt: string }>> => {
  const rows = await db
    .select()
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.userId, userId),
        eq(chatMessages.conversationId, conversationId),
      ),
    )
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);
  return rows
    .map((r) => ({
      role: r.role as Role,
      content: r.content,
      createdAt: r.createdAt.toISOString(),
    }))
    .reverse();
};

/** Generate a short, stable conversation id (used by the client). */
export const newConversationId = (): string => randomUUID();
