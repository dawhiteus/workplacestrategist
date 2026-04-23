'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, Loader2, Sparkles } from 'lucide-react'
import type { ChatMessage, RailInsight, ActiveTool, CanvasData } from '@/components/layout/Shell'
import type { MetroSummary } from '@/lib/types'
import { routeQuery } from '@/lib/queryRouter'

interface ConversationPanelProps {
  messages: ChatMessage[]
  isStreaming: boolean
  onAddMessage: (msg: ChatMessage) => void
  onAddInsight: (insight: RailInsight) => void
  onStreamingChange: (streaming: boolean) => void
  onCanvasData: (data: CanvasData) => void
  activeTool: ActiveTool
  metros: MetroSummary[]
}

export function ConversationPanel({
  messages,
  isStreaming,
  onAddMessage,
  onAddInsight,
  onStreamingChange,
  onCanvasData,
  activeTool,
  metros,
}: ConversationPanelProps) {
  const [input, setInput] = useState('')
  const [streamingText, setStreamingText] = useState('')
  const [toolInProgress, setToolInProgress] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const latestStreamRef = useRef('')

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  useEffect(() => {
    function onAskQuestion(e: Event) {
      const { question } = (e as CustomEvent).detail
      handleSend(question)
    }
    window.addEventListener('ask-question', onAskQuestion)
    return () => window.removeEventListener('ask-question', onAskQuestion)
  }, []) // eslint-disable-line

  async function handleSend(text?: string) {
    const query = text || input.trim()
    if (!query || isStreaming) return

    setInput('')

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date(),
    }
    onAddMessage(userMsg)

    // --- Data-driven routing — answers appear in chat only, no canvas side-effects ---
    const action = routeQuery(query, metros)

    const reply = action.type === 'answer'
      ? action.text
      : `I can answer questions about any market, compare cities, or summarize the portfolio. Try "How many reservations in Atlanta?" or "Compare Atlanta and New York."`

    onAddMessage({
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: reply,
      timestamp: new Date(),
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      {/* Header */}
      <div className="flex-shrink-0 px-3 py-2 border-b border-border flex items-center gap-1.5">
        <Sparkles size={11} className="text-ls-500" />
        <span className="text-[11px] font-semibold text-subtle uppercase tracking-wider">Conversation</span>
      </div>

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2 min-h-0">

        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center">
            <div className="w-8 h-8 rounded-full bg-ls-50 border border-ls-100 flex items-center justify-center mb-3">
              <Bot size={14} className="text-ls-500" />
            </div>
            <p className="text-[11px] text-subtle leading-relaxed px-2">
              Ask about any market, compare cities, or rank the portfolio.
            </p>
          </div>
        )}

        {/* Messages */}
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Tool in progress */}
        {toolInProgress && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-ls-50 rounded-lg border border-ls-100">
            <Loader2 size={11} className="text-ls-500 animate-spin flex-shrink-0" />
            <span className="text-[11px] text-ls-600">Loading {toolInProgress}…</span>
          </div>
        )}

        {/* Streaming (unused now but kept for future AI use) */}
        {streamingText && (
          <div className="flex gap-1.5">
            <div className="w-5 h-5 rounded-full bg-ls-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bot size={10} className="text-white" />
            </div>
            <div className="flex-1 bg-card border border-border rounded-xl px-2.5 py-1.5">
              <p className="text-[11px] text-body leading-relaxed whitespace-pre-wrap">{streamingText}
                <span className="inline-block w-0.5 h-2.5 bg-ls-500 ml-0.5 animate-pulse" />
              </p>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-3 pb-3 pt-2 border-t border-border">
        <div className="flex items-end gap-1.5 bg-page border border-border rounded-xl px-2.5 py-2 focus-within:border-ls-500 transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about a market…"
            rows={1}
            disabled={isStreaming}
            className="flex-1 bg-transparent text-[11px] text-body placeholder-subtle resize-none outline-none leading-relaxed disabled:opacity-50"
            style={{ minHeight: '18px', maxHeight: '72px' }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isStreaming}
            className="w-6 h-6 rounded-lg bg-ls-500 text-white flex items-center justify-center hover:bg-ls-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            {isStreaming ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
          </button>
        </div>
        <div className="text-center text-[9px] text-subtle mt-1">↵ send · ⇧↵ newline</div>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[88%] bg-ls-500 text-white rounded-xl px-2.5 py-1.5">
          <p className="text-[11px] leading-relaxed">{message.content}</p>
        </div>
      </div>
    )
  }

  const isError = message.content.startsWith('⚠')

  return (
    <div className="flex gap-1.5">
      <div className="w-5 h-5 rounded-full bg-ls-500 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot size={10} className="text-white" />
      </div>
      <div className={`flex-1 rounded-xl px-2.5 py-1.5 border ${isError ? 'bg-red-50 border-red-200' : 'bg-card border-border'}`}>
        <p className={`text-[11px] leading-relaxed whitespace-pre-wrap ${isError ? 'text-danger' : 'text-body'}`}>
          {message.content}
        </p>
        <div className="text-[9px] text-subtle mt-0.5">
          {message.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}
