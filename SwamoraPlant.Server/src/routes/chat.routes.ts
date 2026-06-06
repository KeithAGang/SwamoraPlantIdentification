/**
 * Savi chat routes.
 *
 *   POST /api/savi/chat           – non-streaming JSON reply (backwards compat)
 *   POST /api/savi/chat/stream    – Server-Sent Events stream of the reply
 *   GET  /api/savi/conversations/:id – fetch history for a conversation
 *
 * Both endpoints accept:
 *   { messages: [{role, content}, ...], conversationId?: string, diagnosisId?: number }
 */

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { authMiddleware } from '../middleware/auth.middleware.js';
import {
  buildSystemPrompt,
  getConversation,
  loadDiagnosisContext,
  loadFarmContext,
  newConversationId,
  saveMessage,
  streamGroq,
  type ChatMessageInput,
  type Role,
} from '../services/chat.service.js';

// Hono's openapi router is overkill here — streaming is easier on plain Hono.
export const chatRouter = new Hono();

chatRouter.use('/*', authMiddleware);

interface ChatBody {
  messages?: Array<{ role?: string; content?: string }>;
  conversationId?: string;
  diagnosisId?: number;
  farmId?: number;
}

const validateMessages = (raw: ChatBody['messages']): ChatMessageInput[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m): m is { role: Role; content: string } =>
        typeof m?.content === 'string' &&
        (m.role === 'user' || m.role === 'assistant' || m.role === 'system'),
    )
    .map((m) => ({ role: m.role, content: m.content }));
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getUserId = (c: any): number => {
  const payload = c.get('jwtUser') as { id?: number } | undefined;
  if (!payload?.id) throw new Error('Missing user in JWT payload');
  return payload.id;
};

// ── POST /chat ─────────────────────────────────────────────────────────────
// Non-streaming JSON reply. Kept for back-compat with the existing SaviDialog
// which still uses the simple { reply } shape.
chatRouter.post('/chat', async (c) => {
  try {
    const userId = getUserId(c);
    const body = (await c.req.json().catch(() => ({}))) as ChatBody;
    const messages = validateMessages(body.messages);
    if (messages.length === 0) {
      return c.json({ error: 'messages[] is required' }, 400);
    }

    const [diagnosisCtx, farmCtx] = await Promise.all([
      typeof body.diagnosisId === 'number'
        ? loadDiagnosisContext(userId, body.diagnosisId)
        : Promise.resolve(undefined),
      typeof body.farmId === 'number'
        ? loadFarmContext(userId, body.farmId)
        : Promise.resolve(undefined),
    ]);
    const systemPrompt = buildSystemPrompt({
      diagnosis: diagnosisCtx,
      farm: farmCtx,
    });
    const conversationId = body.conversationId || newConversationId();

    // Persist the latest user message (the one the LLM is about to answer).
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUser) {
      await saveMessage({
        userId,
        conversationId,
        diagnosisId: body.diagnosisId ?? null,
        role: 'user',
        content: lastUser.content,
      });
    }

    let reply = '';
    try {
      for await (const chunk of streamGroq(systemPrompt, messages)) {
        reply += chunk;
      }
    } catch (err) {
      console.error('[savi] streamGroq error:', err);
      reply =
        'Sorry, I could not reach the Savi service right now. Please try again in a moment.';
    }

    await saveMessage({
      userId,
      conversationId,
      diagnosisId: body.diagnosisId ?? null,
      role: 'assistant',
      content: reply,
    });

    return c.json({ reply, conversationId });
  } catch (err) {
    console.error('[savi:chat] failed:', err);
    return c.json({ error: 'Chat failed' }, 500);
  }
});

// ── POST /chat/stream ──────────────────────────────────────────────────────
// SSE stream. Each event is:
//   event: token     data: {"delta":"..."}
//   event: done      data: {"conversationId":"...","reply":"..."}
chatRouter.post('/chat/stream', async (c) => {
  const userId = getUserId(c);
  const body = (await c.req.json().catch(() => ({}))) as ChatBody;
  const messages = validateMessages(body.messages);
  if (messages.length === 0) {
    return c.json({ error: 'messages[] is required' }, 400);
  }

  const [diagnosisCtx, farmCtx] = await Promise.all([
    typeof body.diagnosisId === 'number'
      ? loadDiagnosisContext(userId, body.diagnosisId)
      : Promise.resolve(undefined),
    typeof body.farmId === 'number'
      ? loadFarmContext(userId, body.farmId)
      : Promise.resolve(undefined),
  ]);
  const systemPrompt = buildSystemPrompt({
    diagnosis: diagnosisCtx,
    farm: farmCtx,
  });
  const conversationId = body.conversationId || newConversationId();

  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  if (lastUser) {
    await saveMessage({
      userId,
      conversationId,
      diagnosisId: body.diagnosisId ?? null,
      role: 'user',
      content: lastUser.content,
    });
  }

  return streamSSE(c, async (stream) => {
    let full = '';
    try {
      for await (const delta of streamGroq(systemPrompt, messages)) {
        full += delta;
        await stream.writeSSE({ event: 'token', data: JSON.stringify({ delta }) });
      }
    } catch (err) {
      console.error('[savi:stream] error:', err);
      const errMsg =
        'Sorry, I could not reach the Savi service right now. Please try again.';
      full = errMsg;
      await stream.writeSSE({
        event: 'token',
        data: JSON.stringify({ delta: errMsg }),
      });
    }

    await saveMessage({
      userId,
      conversationId,
      diagnosisId: body.diagnosisId ?? null,
      role: 'assistant',
      content: full,
    });

    await stream.writeSSE({
      event: 'done',
      data: JSON.stringify({ conversationId, reply: full }),
    });
  });
});

// ── GET /conversations/:id ────────────────────────────────────────────────
chatRouter.get('/conversations/:id', async (c) => {
  try {
    const userId = getUserId(c);
    const id = c.req.param('id');
    const msgs = await getConversation(userId, id);
    return c.json({ conversationId: id, messages: msgs });
  } catch (err) {
    console.error('[savi:history] failed:', err);
    return c.json({ error: 'Lookup failed' }, 500);
  }
});
