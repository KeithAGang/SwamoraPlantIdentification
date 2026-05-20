import { useEffect, useMemo, useRef, useState } from 'react'
import { Send, Sparkles, X } from 'lucide-react'
import { saviApi, type SaviMessage } from '@/lib/savi'
import { cn } from '@/lib/utils'

interface SaviDialogProps {
  open: boolean
  onClose: () => void
  /** Optional diagnosis to ground the conversation. Server pulls the full record. */
  diagnosisId?: number
  /** Optional override for suggestion chips (e.g. on the Diagnose page). */
  starters?: string[]
}

const DEFAULT_STARTERS = [
  'How is my farm doing today?',
  'Any pests I should worry about?',
  "What's the weather outlook?",
  'Tips to improve maize yield?',
]

const DIAGNOSIS_STARTERS = [
  'How do I apply the recommended treatment?',
  'Will this product harm bees or pets?',
  'What weather is best to spray?',
  'How can I prevent this next season?',
]

export function SaviDialog({
  open,
  onClose,
  diagnosisId,
  starters,
}: SaviDialogProps) {
  const [messages, setMessages] = useState<SaviMessage[]>([])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>()
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const chipStarters = useMemo(
    () => starters ?? (diagnosisId ? DIAGNOSIS_STARTERS : DEFAULT_STARTERS),
    [starters, diagnosisId],
  )

  // Reset state each time the dialog opens
  useEffect(() => {
    if (open) {
      setMessages([])
      setInput('')
      setPending(false)
      setConversationId(undefined)
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      abortRef.current?.abort()
      abortRef.current = null
    }
  }, [open])

  // Escape key closes the dialog
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, pending])

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || pending) return
    const userMsg: SaviMessage = { role: 'user', content: trimmed }
    const next: SaviMessage[] = [...messages, userMsg]
    // Optimistically render the user turn + an empty assistant turn we'll
    // fill in as tokens stream back.
    setMessages([...next, { role: 'assistant', content: '' }])
    setInput('')
    setPending(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await saviApi.chatStream(
        {
          messages: next,
          diagnosisId,
          conversationId,
        },
        (delta) => {
          setMessages((m) => {
            const copy = m.slice()
            const last = copy[copy.length - 1]
            if (last && last.role === 'assistant') {
              copy[copy.length - 1] = { ...last, content: last.content + delta }
            }
            return copy
          })
        },
        controller.signal,
      )
      if (res.conversationId) setConversationId(res.conversationId)
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setMessages((m) => {
          const copy = m.slice()
          copy[copy.length - 1] = {
            role: 'assistant',
            content:
              'Something went wrong while reaching Savi. Please try again.',
          }
          return copy
        })
      }
    } finally {
      setPending(false)
      abortRef.current = null
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="savi-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[oklch(0.12_0.02_145)/0.45] backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Dialog panel */}
      <div className="relative glass-card rounded-[24px] w-full max-w-[640px] max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="ai-pill h-9 w-9 rounded-full flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 id="savi-title" className="text-base font-semibold tracking-tight">
                Savi
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Your FarmSight AI copilot · ask anything about your farm
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="glass-pill h-8 w-8 rounded-full flex items-center justify-center hover:bg-white/95"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Body */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
        >
          {messages.length === 0 && !pending && (
            <div className="space-y-4">
              <div
                className="rounded-2xl px-4 py-3 text-sm leading-relaxed"
                style={{
                  background:
                    'linear-gradient(180deg, #fff7c2 0%, #ffefa1 100%)',
                  color: '#3a3416',
                }}
              >
                <span className="font-semibold">Hi, I'm Savi 🌱 </span>
                {diagnosisId ? (
                  <>
                    I have your latest diagnosis in front of me. Ask me how to
                    apply the treatment, when to spray, or what to do next.
                  </>
                ) : (
                  <>
                    I can answer questions about your crops, soil, weather,
                    pests, diagnoses and yields.
                  </>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {chipStarters.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="glass-pill rounded-xl text-left px-3 py-2 text-xs font-medium hover:bg-white/95"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => {
            const isLastAssistant =
              i === messages.length - 1 && m.role === 'assistant'
            if (isLastAssistant && pending && !m.content) return <TypingBubble key={i} />
            return <ChatBubble key={i} role={m.role} content={m.content} />
          })}

          {messages.length > 0 && (
            <p className="text-[10px] text-muted-foreground pt-1 px-1">
              Savi is AI-generated. Verify chemical dosages with a local
              agronomist before applying.
            </p>
          )}
        </div>

        {/* Composer */}
        <form
          className="border-t border-white/40 px-3 py-3 flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(input)
              }
            }}
            rows={1}
            placeholder="Ask Savi about your farm…"
            className="flex-1 resize-none max-h-32 rounded-2xl glass-pill px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={!input.trim() || pending}
            aria-label="Send"
            className="h-10 w-10 rounded-full bg-[#1a1d1a] text-white flex items-center justify-center shadow-[0_6px_16px_rgba(20,30,20,0.25)] hover:bg-[#262a26] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  )
}

function ChatBubble({
  role,
  content,
}: {
  role: SaviMessage['role']
  content: string
}) {
  if (role === 'system') return null
  const isUser = role === 'user'
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
          isUser
            ? 'bg-[#1a1d1a] text-white rounded-br-md'
            : 'glass-pill text-foreground rounded-bl-md',
        )}
      >
        {content}
      </div>
    </div>
  )
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="glass-pill rounded-2xl rounded-bl-md px-3.5 py-2 text-sm">
        <span className="inline-flex items-center gap-1">
          <Dot delay={0} />
          <Dot delay={150} />
          <Dot delay={300} />
        </span>
      </div>
    </div>
  )
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full bg-foreground/50 animate-bounce"
      style={{ animationDelay: `${delay}ms` }}
    />
  )
}
