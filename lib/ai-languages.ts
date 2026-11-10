// lib/ai-languages.ts
// Supported languages for AI responses — shared by client and server

export interface AILanguage {
  code: string
  label: string
  name: string
}

export const AI_LANGUAGES: AILanguage[] = [
  { code: 'en', label: 'English', name: 'English' },
  { code: 'hi', label: 'हिंदी', name: 'Hindi' },
  { code: 'bn', label: 'বাংলা', name: 'Bengali' },
  { code: 'ta', label: 'தமிழ்', name: 'Tamil' },
  { code: 'te', label: 'తెలుగు', name: 'Telugu' },
]

export const DEFAULT_AI_LANGUAGE = 'en'

export function getLanguage(code?: string | null): AILanguage {
  return AI_LANGUAGES.find((l) => l.code === code) ?? AI_LANGUAGES[0]
}

export function getLanguageName(code?: string | null): string {
  return getLanguage(code).name
}
