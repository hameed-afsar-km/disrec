'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, MessageCircle, Mic, MicOff, Send, User, Globe } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Markdown } from '@/components/ui/Markdown'
import {
  AI_LANGUAGES,
  getSpeechCode,
  getLanguageName,
  type BrowserSpeechRecognition,
} from '@/lib/ai-languages'
import type { Incident } from '@/lib/types'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const greeting = 'I can help assess this incident, identify information gaps, and suggest safe next operational steps. What would you like to know?'

const SUGGESTED_QUESTIONS = [
  'Assess severity and immediate hazard',
  'Recommend response units & equipment',
  'What critical info is missing?',
  'Draft community alert broadcast',
]

interface IncidentAiChatProps {
  incident: Incident
  buttonVariant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost'
  buttonSize?: 'sm' | 'md' | 'lg'
  buttonClassName?: string
  buttonLabel?: string
  iconOnly?: boolean
}

export function IncidentAiChat({
  incident,
  buttonVariant = 'primary',
  buttonSize = 'sm',
  buttonClassName,
  buttonLabel = 'Ask AI about this incident',
  iconOnly = false,
}: IncidentAiChatProps) {
  const [open, setOpen] = useState(false)
  const [selectedLang, setSelectedLang] = useState('en')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const speechBaseInputRef = useRef('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => () => recognitionRef.current?.stop(), [])

  function stopListening() {
    recognitionRef.current?.stop()
    setListening(false)
  }

  function toggleSpeechToText() {
    if (listening) {
      stopListening()
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.error('Speech-to-text is not supported in this browser. Try Chrome or Edge.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = getSpeechCode(selectedLang)
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? '')
        .join('')
        .trim()
      if (transcript) setInput(`${speechBaseInputRef.current}${speechBaseInputRef.current ? ' ' : ''}${transcript}`)
    }
    recognition.onerror = (event) => {
      if (event.error !== 'aborted') toast.error('Unable to capture speech. Please try again.')
      setListening(false)
    }
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    speechBaseInputRef.current = input.trim()
    recognition.start()
    setListening(true)
    toast.info(`Listening in ${getLanguageName(selectedLang)}...`)
  }

  async function handleSend(customText?: string) {
    const query = (customText ?? input).trim()
    if (!query || loading) return

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: query }]
    setMessages(nextMessages)
    setInput('')
    stopListening()
    setLoading(true)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages, incident, language: selectedLang }),
      })
      const data = await response.json()
      if (!response.ok || !data.reply) throw new Error(data.error || 'No response from AI')
      setMessages([...nextMessages, { role: 'assistant', content: data.reply }])
    } catch (error) {
      console.error(error)
      toast.error('The incident AI assistant is unavailable. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={buttonVariant}
        size={buttonSize}
        className={buttonClassName || 'w-full text-xs'}
        onClick={() => setOpen(true)}
        title="Ask AI about this incident"
      >
        <MessageCircle size={14} className="text-blue-500" />
        {!iconOnly && <span>{buttonLabel}</span>}
      </Button>

      <Modal open={open} onClose={() => { stopListening(); setOpen(false) }} title="Ask AI about this incident" size="xl" className="max-h-[90vh] flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-2 truncate">
            <Bot size={16} className="text-blue-600 shrink-0" />
            <span className="truncate">Context: <strong className="text-slate-700">{incident.title}</strong> · #{incident.incidentId.slice(-6)}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Multi-language selector */}
            <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-md px-1.5 py-0.5 text-slate-700">
              <Globe size={13} className="text-slate-400" />
              <select
                value={selectedLang}
                onChange={(e) => {
                  setSelectedLang(e.target.value)
                  stopListening()
                }}
                className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer"
                title="Select Language for Speech Recognition & AI Response"
              >
                {AI_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-[10px] font-mono uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
              {incident.category.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="h-[min(52vh,430px)] overflow-y-auto space-y-4 py-4 pr-1">
          {[{ role: 'assistant' as const, content: greeting }, ...messages].map((message, index) => (
            <div key={index} className={`flex items-start gap-2 ${message.role === 'user' ? 'justify-end' : ''}`}>
              {message.role === 'assistant' && <Bot size={17} className="mt-1 text-blue-600 shrink-0" />}
              <div className={`max-w-[85%] rounded-xl px-3 py-2.5 text-sm leading-relaxed ${message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                <Markdown content={message.content} inverted={message.role === 'user'} className="text-sm" />
              </div>
              {message.role === 'user' && <User size={17} className="mt-1 text-slate-500 shrink-0" />}
            </div>
          ))}

          {/* Quick Prompts Suggestions */}
          {messages.length === 0 && !loading && (
            <div className="pt-2">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Suggested prompts:</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleSend(q)}
                    className="text-xs bg-blue-50/70 hover:bg-blue-100 text-blue-700 border border-blue-200/60 rounded-lg px-2.5 py-1 text-left transition-colors"
                  >
                    ⚡ {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && <div className="flex items-center gap-2 text-xs text-slate-500"><Bot size={17} className="text-blue-600 animate-pulse" /> Reviewing incident context & operational data…</div>}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={(event) => { event.preventDefault(); handleSend() }} className="flex items-center gap-2 pt-3 border-t border-slate-100">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={loading}
            placeholder="Ask a follow-up about this incident…"
            className="min-w-0 flex-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button type="button" variant={listening ? 'danger' : 'outline'} size="sm" className="px-2.5" onClick={toggleSpeechToText} aria-label={listening ? 'Stop speech-to-text' : 'Start speech-to-text'} title={listening ? 'Stop listening' : 'Speak your question'} disabled={loading}>
            {listening ? <MicOff size={16} /> : <Mic size={16} />}
          </Button>
          <Button type="submit" size="sm" className="px-3" disabled={loading || !input.trim()} aria-label="Send question">
            <Send size={16} />
          </Button>
        </form>
        <p className="pt-2 text-[11px] text-slate-400">Use the microphone to dictate a question. AI guidance supports, but does not replace, dispatch procedures or emergency services.</p>
      </Modal>
    </>
  )
}
