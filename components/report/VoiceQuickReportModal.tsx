// components/report/VoiceQuickReportModal.tsx
// Multi-language Voice AI Quick Incident Reporter
// Uses Web Speech API (STT in en, hi, bn, ta, te), conversational AI extraction,
// and proactive questioning for family safety, casualties, and environmental hazards.

'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Mic, MicOff, Send, Bot, User, Sparkles, MapPin, AlertTriangle,
  ShieldCheck, Volume2, VolumeX, CheckCircle, Navigation, Users, Flame,
  RefreshCw, ArrowRight, Loader2, Globe, HeartHandshake, Eye
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SeverityBadge } from '@/components/ui/Badge'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth/AuthProvider'
import {
  AI_LANGUAGES,
  getSpeechCode,
  getLanguageName,
  type BrowserSpeechRecognition,
  type BrowserSpeechRecognitionEvent,
} from '@/lib/ai-languages'
import { createIncident, nowISO } from '@/lib/firestore'
import { generateId, categoryIcons } from '@/lib/utils'
import type { EmergencyCategory, Severity, Incident } from '@/lib/types'
import { CATEGORY_LABELS } from '@/lib/types'
import type { QuickReportExtracted } from '@/app/api/ai/quick-report/route'

interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

interface VoiceQuickReportModalProps {
  open: boolean
  onClose: () => void
  onTransferToForm?: (extracted: QuickReportExtracted, gps?: { latitude: number; longitude: number; address: string }) => void
}

const INITIAL_GREETINGS: Record<string, string> = {
  en: "I'm your Emergency Voice AI Assistant. Tell me what happened, where you are, and if you or your family need immediate help.",
  hi: "मैं आपका आपातकालीन वॉइस AI सहायक हूँ। कृपया बताएं क्या हुआ है, आप कहाँ हैं, और क्या आप या आपका परिवार खतरे में है?",
  bn: "আমি আপনার জরুরি ভয়েস AI সহায়ক। বলুন কী ঘটেছে, আপনি কোথায় আছেন এবং আপনি বা আপনার পরিবার নিরাপদ কিনা।",
  ta: "நான் உங்கள் அவசர குரல் AI உதவியாளர். என்ன நடந்தது, நீங்கள் எங்கு உள்ளீர்கள், உங்கள் குடும்பம் பாதுகாப்பாக உள்ளதா என்று கூறுங்கள்.",
  te: "నేను మీ అత్యవసర వాయిస్ AI సహాయకుడిని. ఏమి జరిగిందో, మీరు ఎక్కడ ఉన్నారో, మరియు మీ కుటుంబం సురక్షితంగా ఉందో లేదో చెప్పండి.",
}

export function VoiceQuickReportModal({
  open,
  onClose,
  onTransferToForm,
}: VoiceQuickReportModalProps) {
  const router = useRouter()
  const { firebaseUser, appUser } = useAuth()

  // Language state
  const [selectedLang, setSelectedLang] = useState('en')

  // STT state
  const [listening, setListening] = useState(false)
  const [speechInterim, setSpeechInterim] = useState('')
  const [audioFeedback, setAudioFeedback] = useState(false)
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const baseInputRef = useRef('')

  // Conversational state
  const [messages, setMessages] = useState<ChatTurn[]>([])
  const [inputText, setInputText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  // Extracted incident data
  const [extracted, setExtracted] = useState<QuickReportExtracted | null>(null)

  // GPS state
  const [gpsLocation, setGpsLocation] = useState<{
    latitude: number
    longitude: number
    address: string
  } | null>(null)
  const [fetchingGps, setFetchingGps] = useState(false)

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isProcessing, speechInterim])

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  // Auto-detect GPS when modal opens
  useEffect(() => {
    if (open && !gpsLocation && navigator.geolocation) {
      detectGps()
    }
  }, [open])

  // Reset or initialize greeting on open/lang change
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: INITIAL_GREETINGS[selectedLang] || INITIAL_GREETINGS.en,
        },
      ])
    }
  }, [open, selectedLang])

  function detectGps() {
    if (!navigator.geolocation) return
    setFetchingGps(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        let address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          )
          const data = await res.json()
          if (data?.display_name) address = data.display_name
        } catch {
          // fallback to lat/long
        }
        setGpsLocation({ latitude, longitude, address })
        setFetchingGps(false)
      },
      (err) => {
        console.warn('Geolocation failed:', err.message)
        setFetchingGps(false)
      },
      { timeout: 8000 }
    )
  }

  function playTts(text: string) {
    if (!audioFeedback || typeof window === 'undefined' || !window.speechSynthesis) return
    try {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = getSpeechCode(selectedLang)
      utterance.rate = 1.05
      window.speechSynthesis.speak(utterance)
    } catch (e) {
      console.warn('Speech synthesis error:', e)
    }
  }

  function stopListening() {
    recognitionRef.current?.stop()
    setListening(false)
    setSpeechInterim('')
  }

  function startListening() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      toast.error('Voice recognition is not supported in this browser. Try Chrome, Edge, or Safari.')
      return
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }

      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = getSpeechCode(selectedLang)

      recognition.onresult = (event) => {
        let interim = ''
        let finalChunk = ''
        const startIdx = event.resultIndex ?? 0
        for (let i = startIdx; i < event.results.length; ++i) {
          const item = event.results[i]
          const transcript = item?.[0]?.transcript ?? ''
          if (item?.isFinal) {
            finalChunk += transcript
          } else {
            interim += transcript
          }
        }

        if (finalChunk) {
          setInputText((prev) => `${prev ? prev + ' ' : ''}${finalChunk.trim()}`)
          setSpeechInterim('')
        } else {
          setSpeechInterim(interim)
        }
      }

      recognition.onerror = (e) => {
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          toast.error(`Microphone error (${e.error}). Try again.`)
        }
        setListening(false)
      }

      recognition.onend = () => {
        setListening(false)
        setSpeechInterim('')
      }

      recognitionRef.current = recognition
      baseInputRef.current = inputText
      recognition.start()
      setListening(true)
      toast.info(`Listening in ${getLanguageName(selectedLang)}... Speak clearly.`)
    } catch (err) {
      console.error(err)
      toast.error('Unable to access microphone. Please grant browser permissions.')
      setListening(false)
    }
  }

  function toggleListening() {
    if (listening) {
      stopListening()
    } else {
      startListening()
    }
  }

  async function handleSendMessage(userQuery?: string) {
    const textToSend = (userQuery ?? inputText).trim()
    if (!textToSend || isProcessing) return

    stopListening()
    setInputText('')
    setSpeechInterim('')

    const updatedMessages: ChatTurn[] = [
      ...messages,
      { role: 'user', content: textToSend },
    ]
    setMessages(updatedMessages)
    setIsProcessing(true)

    try {
      const res = await fetch('/api/ai/quick-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          language: selectedLang,
          gpsLocation,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.extracted) {
        throw new Error(data.error || 'Failed to process voice intake')
      }

      setExtracted(data.extracted)

      const assistantReply =
        data.aiResponse ||
        "I've updated the incident details. Please confirm if you or your family need medical attention."

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: assistantReply },
      ])

      playTts(assistantReply)
    } catch (err: unknown) {
      console.error(err)
      toast.error('AI intake assistant was unable to process. Please try again.')
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'I encountered a communication delay. Could you please repeat what happened or tap the fields on the right to edit?',
        },
      ])
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleSubmitReport() {
    if (!extracted) {
      toast.error('Please describe the emergency first before submitting.')
      return
    }

    setIsSubmitting(true)
    try {
      const incidentId = generateId()
      const finalTitle = extracted.title || 'Emergency Incident Report'
      const finalCategory = extracted.category || 'other'
      const finalSeverity = extracted.severity || 'medium'
      const finalLocation = extracted.location || gpsLocation?.address || 'Location provided via voice'

      const newIncident: Incident = {
        incidentId,
        reporterId: firebaseUser?.uid || 'anonymous',
        reporterName: appUser?.name || 'Anonymous Citizen',
        reporterEmail: appUser?.email || '',
        title: finalTitle,
        description: `${extracted.description}\n\n[Family Status]: ${extracted.familyStatus || 'Unspecified'}\n[Special Hazards]: ${extracted.hazards || 'None reported'}`,
        category: finalCategory,
        severity: finalSeverity,
        aiSuggestedSeverity: finalSeverity,
        aiSeverityReason: extracted.severityReason || 'Categorized via AI Voice Intake',
        location: finalLocation,
        latitude: gpsLocation?.latitude || 28.6139,
        longitude: gpsLocation?.longitude || 77.2090,
        peopleAffected: Number(extracted.peopleAffected) || 1,
        evidenceUrls: [],
        status: 'reported',
        verified: false,
        createdAt: nowISO(),
        updatedAt: nowISO(),
      }

      await createIncident(newIncident)

      toast.success('Emergency Incident Filed Successfully! Responders alerted.')
      onClose()
      router.push(`/my-reports/${incidentId}`)
    } catch (err: unknown) {
      console.error(err)
      toast.error('Failed to submit emergency report. Please try again or call 112.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleTransfer() {
    if (!extracted) return
    if (onTransferToForm) {
      onTransferToForm(extracted, gpsLocation || undefined)
      onClose()
    } else {
      // Navigate to report page with prefilled params
      const q = new URLSearchParams({
        category: extracted.category,
        title: extracted.title,
      })
      router.push(`/report?${q.toString()}`)
      onClose()
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        stopListening()
        onClose()
      }}
      title="Voice AI Emergency Reporter"
      size="xl"
      className="!max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden"
    >
      {/* Top Header Toolbar */}
      <div className="bg-gradient-to-r from-red-50/90 via-orange-50/70 to-amber-50/50 text-[#101b2d] p-4 flex flex-wrap items-center justify-between gap-3 border-b border-orange-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-[#e53945] to-orange-500 text-white shadow-sm shadow-red-200">
            <Mic size={18} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2 text-[#101b2d]">
              Multi-Language Voice Triage
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-300">
                LIVE STT
              </span>
            </h3>
            <p className="text-xs text-slate-500">Speak naturally in your language; AI extracts incident & family status</p>
          </div>
        </div>

        {/* Language Selector & Audio TTS Toggle */}
        <div className="flex items-center gap-2">
          {/* Audio TTS Feedback Toggle */}
          <button
            type="button"
            onClick={() => setAudioFeedback(!audioFeedback)}
            className={`p-1.5 rounded-lg border text-xs transition-colors flex items-center gap-1.5 ${
              audioFeedback
                ? 'bg-orange-100/80 border-orange-300 text-orange-700 font-semibold'
                : 'bg-white border-slate-200 text-slate-600 hover:text-orange-600 hover:border-orange-200 shadow-2xs'
            }`}
            title={audioFeedback ? 'Voice Speech Output Enabled' : 'Voice Speech Output Muted'}
          >
            {audioFeedback ? <Volume2 size={15} className="text-orange-600" /> : <VolumeX size={15} />}
            <span className="text-[11px] font-medium hidden sm:inline">
              {audioFeedback ? 'Voice On' : 'Muted'}
            </span>
          </button>

          {/* Language Selector */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
            <Globe size={14} className="text-slate-400 ml-1.5" />
            <select
              value={selectedLang}
              onChange={(e) => {
                setSelectedLang(e.target.value)
                stopListening()
              }}
              className="bg-transparent text-slate-800 text-xs font-semibold focus:outline-none pr-2 py-1 cursor-pointer"
            >
              {AI_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} className="bg-white text-slate-800">
                  {l.label} ({l.name})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Body Split: Left Conversational Feed, Right Live Extraction Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto lg:overflow-hidden lg:min-h-[460px]">
        
        {/* Left Column (Conversational Dialogue & Mic) */}
        <div className="lg:col-span-7 min-w-0 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/50 p-4">
          
          {/* Chat Bubble Stream */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[340px] sm:max-h-[380px]">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2.5 ${m.role === 'user' ? 'justify-end' : ''}`}
              >
                {m.role === 'assistant' && (
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-red-100 to-orange-100 text-orange-600 border border-orange-200 shrink-0 mt-0.5">
                    <Bot size={16} />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed shadow-sm ${
                    m.role === 'user'
                      ? 'bg-gradient-to-r from-[#e53945] to-orange-500 text-white rounded-tr-none shadow-red-200'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
                {m.role === 'user' && (
                  <div className="p-1.5 rounded-lg bg-orange-100 text-orange-700 shrink-0 mt-0.5">
                    <User size={16} />
                  </div>
                )}
              </div>
            ))}

            {/* Interim live speech recognition streaming */}
            {listening && speechInterim && (
              <div className="flex items-start justify-end gap-2 text-xs">
                <div className="max-w-[85%] rounded-2xl px-3 py-2 bg-orange-50 text-orange-950 border border-orange-200 italic animate-pulse">
                  🎙️ {speechInterim}...
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="flex items-center gap-2 text-xs text-orange-700 bg-orange-50/90 p-2.5 rounded-xl border border-orange-200 w-fit">
                <Loader2 size={15} className="animate-spin text-orange-500" />
                <span>AI is analyzing voice input & assessing triage fields...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Voice / Input Bar */}
          <div className="pt-3 border-t border-slate-200 space-y-2">
            {/* Suggested quick answer pills */}
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => handleSendMessage("My family is with me and we are safe.")}
                className="bg-white hover:bg-orange-50 hover:border-orange-300 hover:text-orange-950 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200 transition-colors shadow-2xs"
              >
                🛡️ "Family is safe with me"
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage("Someone is trapped inside, please hurry!")}
                className="bg-white hover:bg-orange-50 hover:border-orange-300 hover:text-orange-950 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200 transition-colors shadow-2xs"
              >
                ⚠️ "Someone is trapped inside"
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage("There is a strong gas smell and smoke rising.")}
                className="bg-white hover:bg-orange-50 hover:border-orange-300 hover:text-orange-950 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200 transition-colors shadow-2xs"
              >
                🔥 "Gas smell / smoke rising"
              </button>
            </div>

            {/* Input + Mic Controls */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSendMessage()
              }}
              className="flex min-w-0 items-center gap-2"
            >
              <Button
                type="button"
                size="md"
                onClick={toggleListening}
                className={`relative px-4 transition-all duration-200 text-white font-bold ${
                  listening
                    ? 'animate-pulse ring-4 ring-red-400/50 bg-red-600'
                    : 'bg-gradient-to-r from-[#e53945] to-orange-500 hover:opacity-95 shadow-md shadow-red-200'
                }`}
                title={listening ? 'Stop Microphone' : 'Start Multi-Language Microphone'}
              >
                {listening ? <MicOff size={18} /> : <Mic size={18} />}
                <span className="text-xs font-semibold hidden sm:inline ml-1.5">
                  {listening ? 'Listening...' : 'Speak'}
                </span>
              </Button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Speak or type in ${getLanguageName(selectedLang)}...`}
                className="min-w-0 flex-1 px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
                disabled={isProcessing}
              />

              <button
                type="submit"
                disabled={isProcessing || !inputText.trim()}
                className="h-10 px-3.5 rounded-lg bg-gradient-to-r from-[#e53945] to-orange-500 text-white font-semibold flex items-center justify-center hover:opacity-95 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Dynamic Live Incident Preview Card */}
        <div className="lg:col-span-5 min-w-0 p-4 flex flex-col justify-between bg-white overflow-visible lg:overflow-y-auto lg:max-h-[460px]">
          <div>
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-orange-500" />
                Live Structured Report
              </h4>
              {extracted?.isReadyToSubmit && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle size={12} /> Ready to Submit
                </span>
              )}
            </div>

            {/* Extracted Card Body */}
            {extracted ? (
              <div className="space-y-3">
                {/* Title & Category Header */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                      {categoryIcons[extracted.category] || '⚠️'}
                      {CATEGORY_LABELS[extracted.category] || extracted.category}
                    </span>
                    <SeverityBadge severity={extracted.severity} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 leading-snug">
                    {extracted.title}
                  </h4>
                  {extracted.severityReason && (
                    <p className="text-[11px] text-slate-500 mt-1 italic">
                      AI Triage: {extracted.severityReason}
                    </p>
                  )}
                </div>

                {/* Family & Safety Status Pill */}
                <div className="bg-amber-50/70 border border-amber-200/80 p-2.5 rounded-xl">
                  <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                    <HeartHandshake size={13} className="text-amber-700" />
                    Family & Life Safety Status
                  </span>
                  <p className="text-xs font-semibold text-amber-950">
                    {extracted.familyStatus || 'Unspecified — please confirm family safety with AI.'}
                  </p>
                </div>

                {/* Secondary Hazards */}
                {extracted.hazards && (
                  <div className="bg-red-50/70 border border-red-200/80 p-2.5 rounded-xl">
                    <span className="text-[10px] font-bold text-red-900 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                      <AlertTriangle size={13} className="text-red-700" />
                      Special Problems & Hazards
                    </span>
                    <p className="text-xs text-red-900 font-medium">{extracted.hazards}</p>
                  </div>
                )}

                {/* Location & GPS */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <MapPin size={12} className="text-orange-500" /> Location
                    </span>
                    <button
                      type="button"
                      onClick={detectGps}
                      disabled={fetchingGps}
                      className="text-[10px] text-orange-600 hover:text-red-600 hover:underline flex items-center gap-1 font-medium"
                    >
                      <Navigation size={10} className={fetchingGps ? 'animate-spin' : ''} />
                      {fetchingGps ? 'Locking GPS...' : 'Refresh GPS'}
                    </button>
                  </div>
                  <p className="font-semibold text-slate-800">
                    {extracted.location || gpsLocation?.address || 'Detecting nearest location...'}
                  </p>
                  {gpsLocation && (
                    <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                      Coord: {gpsLocation.latitude.toFixed(4)}, {gpsLocation.longitude.toFixed(4)}
                    </span>
                  )}
                </div>

                {/* Casualties / People Count */}
                <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg border border-slate-200/80 text-xs">
                  <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                    <Users size={14} className="text-slate-400" />
                    People Involved / Affected:
                  </span>
                  <span className="font-bold text-slate-800">
                    {extracted.peopleAffected} {extracted.peopleAffected === 1 ? 'person' : 'people'}
                  </span>
                </div>
              </div>
            ) : (
              /* Empty state before voice input */
              <div className="py-12 px-4 text-center border-2 border-dashed border-orange-200/80 rounded-2xl bg-orange-50/20">
                <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 border border-orange-200/80 flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <Mic size={22} className="animate-pulse" />
                </div>
                <h5 className="text-xs font-bold text-slate-800 mb-1">
                  Waiting for your voice report...
                </h5>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Tap the microphone and describe what you see. The AI will classify the severity, locate you, and check family safety.
                </p>
              </div>
            )}
          </div>

          {/* Action Footer Buttons */}
          <div className="pt-3 mt-3 border-t border-slate-100 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleSubmitReport}
              disabled={isSubmitting || !extracted}
              className="w-full min-h-10 h-auto whitespace-normal py-2.5 px-4 font-bold text-center text-xs sm:text-sm rounded-xl bg-gradient-to-r from-[#e53945] to-orange-500 text-white hover:from-red-600 hover:to-orange-600 shadow-md shadow-red-200 hover:shadow-lg disabled:opacity-45 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Dispatching Emergency Report...
                </>
              ) : (
                <>
                  <AlertTriangle size={16} />
                  Submit Emergency Report Now
                </>
              )}
            </button>

            {extracted && (
              <button
                type="button"
                onClick={handleTransfer}
                className="w-full py-2 px-3 text-xs font-semibold text-slate-600 hover:text-orange-600 hover:border-orange-300 hover:bg-orange-50/30 border border-slate-200 rounded-xl transition-all"
              >
                Transfer to Full Form & Add Photos →
              </button>
            )}
          </div>

        </div>

      </div>
    </Modal>
  )
}
