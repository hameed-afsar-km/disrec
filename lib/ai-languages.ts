// lib/ai-languages.ts
// Supported languages for AI responses — shared by client and server

export interface AILanguage {
  code: string
  label: string
  name: string
  speechCode: string // BCP-47 tag for Web Speech Recognition & Synthesis
}

export const AI_LANGUAGES: AILanguage[] = [
  { code: 'en', label: 'English', name: 'English', speechCode: 'en-IN' },
  { code: 'hi', label: 'हिंदी', name: 'Hindi', speechCode: 'hi-IN' },
  { code: 'bn', label: 'বাংলা', name: 'Bengali', speechCode: 'bn-IN' },
  { code: 'ta', label: 'தமிழ்', name: 'Tamil', speechCode: 'ta-IN' },
  { code: 'te', label: 'తెలుగు', name: 'Telugu', speechCode: 'te-IN' },
]

export const DEFAULT_AI_LANGUAGE = 'en'

export function getLanguage(code?: string | null): AILanguage {
  return AI_LANGUAGES.find((l) => l.code === code) ?? AI_LANGUAGES[0]
}

export function getLanguageName(code?: string | null): string {
  return getLanguage(code).name
}

export function getSpeechCode(code?: string | null): string {
  return getLanguage(code).speechCode
}

// ─────────────────────────────────────────────────────────────────────────────
// Unified Browser Speech Recognition Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SpeechRecognitionResultItem {
  transcript: string
  confidence?: number
}

export interface SpeechRecognitionResultLike {
  isFinal?: boolean
  length: number
  [index: number]: SpeechRecognitionResultItem
}

export interface BrowserSpeechRecognitionEvent {
  resultIndex?: number
  results: {
    length: number
    [index: number]: SpeechRecognitionResultLike
  }
}

export interface BrowserSpeechRecognitionErrorEvent {
  error: string
  message?: string
}

export interface BrowserSpeechRecognition {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

export type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}
