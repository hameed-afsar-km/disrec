// app/(public)/assistant/page.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import {
  Send, Sparkles, AlertTriangle,
  RotateCcw, Bot, User, Globe
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth/AuthProvider'
import { AI_LANGUAGES, DEFAULT_AI_LANGUAGE } from '@/lib/ai-languages'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatStrings {
  subtitle: string
  clear: string
  safetyNotice: string
  loading: string
  suggested: string
  placeholder: string
  greeting: string
  errorNoResponse: string
  errorGeneric: string
  suggestedPrompts: string[]
}

const CHAT_STRINGS: Record<string, ChatStrings> = {
  en: {
    subtitle: '24/7 AI-driven disaster & safety guidance',
    clear: 'Clear',
    safetyNotice:
      'AI responses are for general information. For real emergency response, always contact official authorities or call 112.',
    loading: 'Emergency Assistant is analyzing safety protocols...',
    suggested: 'Suggested Emergency Queries',
    placeholder: 'Ask about evacuation, first aid, disaster steps...',
    greeting:
      "Hello! I am your Emergency AI Assistant. I can help guide you through safety protocols, disaster preparedness, and explain how to report emergencies.\n\n⚠️ **Important**: For immediate life-threatening danger, always contact local emergency dispatch (112 / 100 / 108) first.",
    errorNoResponse: 'AI assistant was unable to generate a response.',
    errorGeneric: 'Failed to communicate with AI Assistant.',
    suggestedPrompts: [
      'What should I do during an active fire?',
      'What steps should I follow after a road accident?',
      'How do I stay safe during a flash flood?',
      'First aid instructions for severe bleeding',
      'What are the 4 emergency severity levels?',
    ],
  },
  hi: {
    subtitle: '24/7 AI-संचालित आपदा और सुरक्षा मार्गदर्शन',
    clear: 'साफ करें',
    safetyNotice:
      'AI प्रतिक्रियाएँ सामान्य जानकारी के लिए हैं। वास्तविक आपातकालीन सहायता के लिए हमेशा आधिकारिक अधिकारियों से संपर्क करें या 112 पर कॉल करें।',
    loading: 'आपातकालीन सहायक सुरक्षा प्रोटोकॉल का विश्लेषण कर रहा है...',
    suggested: 'सुझाए गए आपातकालीन प्रश्न',
    placeholder: 'निकासी, प्राथमिक उपचार, आपदा के कदमों के बारे में पूछें...',
    greeting:
      'नमस्ते! मैं आपका आपातकालीन AI सहायक हूँ। मैं सुरक्षा प्रोटोकॉल, आपदा तैयारी और आपातकाल की रिपोर्ट कैसे करें, इसमें आपका मार्गदर्शन कर सकता हूँ।\n\n⚠️ **महत्वपूर्ण**: जान के लिए तत्काल खतरे की स्थिति में, हमेशा पहले स्थानीय आपातकालीन सेवा (112 / 100 / 108) से संपर्क करें।',
    errorNoResponse: 'AI सहायक उत्तर उत्पन्न नहीं कर सका।',
    errorGeneric: 'AI सहायक से संवाद करने में विफल।',
    suggestedPrompts: [
      'सक्रिय आग के दौरान मुझे क्या करना चाहिए?',
      'सड़क दुर्घटना के बाद कौन से कदम उठाने चाहिए?',
      'अचानक बाढ़ के दौरान मैं सुरक्षित कैसे रहूँ?',
      'गंभीर रक्तस्राव के लिए प्राथमिक उपचार',
      'आपातकाल के 4 गंभीरता स्तर क्या हैं?',
    ],
  },
  bn: {
    subtitle: '24/7 AI-চালিত দুর্যোগ ও নিরাপত্তা নির্দেশনা',
    clear: 'মুছুন',
    safetyNotice:
      'AI-এর উত্তর সাধারণ তথ্যের জন্য। প্রকৃত জরুরি সহায়তার জন্য সর্বদা সরকারি কর্তৃপক্ষের সাথে যোগাযোগ করুন বা 112-এ কল করুন।',
    loading: 'জরুরি সহায়ক নিরাপত্তা প্রোটোকল বিশ্লেষণ করছে...',
    suggested: 'প্রস্তাবিত জরুরি প্রশ্ন',
    placeholder: 'সরিয়ে নেওয়া, প্রাথমিক চিকিৎসা, দুর্যোগের পদক্ষেপ সম্পর্কে জিজ্ঞাসা করুন...',
    greeting:
      'নমস্কার! আমি আপনার জরুরি AI সহায়ক। আমি নিরাপত্তা প্রোটোকল, দুর্যোগ প্রস্তুতি এবং জরুরি অবস্থা কীভাবে রিপোর্ট করবেন তা নির্দেশনা দিতে পারি।\n\n⚠️ **গুরুত্বপূর্ণ**: জীবনের জন্য তাৎক্ষণিক বিপদের ক্ষেত্রে সর্বদা প্রথমে স্থানীয় জরুরি পরিষেবা (112 / 100 / 108) এ যোগাযোগ করুন।',
    errorNoResponse: 'AI সহায়ক উত্তর তৈরি করতে পারেনি।',
    errorGeneric: 'AI সহায়কের সাথে যোগাযোগ করতে ব্যর্থ হয়েছে।',
    suggestedPrompts: [
      'সক্রিয় আগুনের সময় আমার কী করা উচিত?',
      'সড়ক দুর্ঘটনার পরে কী পদক্ষেপ নেওয়া উচিত?',
      'হঠাৎ বন্যার সময় আমি কীভাবে নিরাপদ থাকব?',
      'গুরুতর রক্তক্ষরণের জন্য প্রাথমিক চিকিৎসা',
      'জরুরি অবস্থার ৪টি গুরুত্ব স্তর কী?',
    ],
  },
  ta: {
    subtitle: '24/7 AI இயக்கப்படும் பேரிடர் & பாதுகாப்பு வழிகாட்டுதல்',
    clear: 'அழி',
    safetyNotice:
      'AI பதில்கள் பொதுவான தகவலுக்கானவை. உண்மையான அவசர உதவிக்கு எப்போதும் அதிகாரிகளைத் தொடர்பு கொள்ளுங்கள் அல்லது 112 ஐ அழைக்கவும்.',
    loading: 'அவசர உதவியாளர் பாதுகாப்பு நெறிமுறைகளை பகுப்பாய்வு செய்கிறது...',
    suggested: 'பரிந்துரைக்கப்பட்ட அவசர கேள்விகள்',
    placeholder: 'வெளியேற்றம், முதலுதவி, பேரிடர் நடவடிக்கைகள் பற்றி கேளுங்கள்...',
    greeting:
      'வணக்கம்! நான் உங்கள் அவசர AI உதவியாளர். பாதுகாப்பு நெறிமுறைகள், பேரிடர் முன்னேற்பாடு மற்றும் அவசரநிலைகளை எவ்வாறு புகாரளிப்பது என்பதில் வழிகாட்ட முடியும்.\n\n⚠️ **முக்கியம்**: உயிருக்கு உடனடி ஆபத்து இருந்தால், எப்போதும் முதலில் உள்ளூர் அவசர சேவைகளை (112 / 100 / 108) தொடர்பு கொள்ளுங்கள்.',
    errorNoResponse: 'AI உதவியாளரால் பதிலை உருவாக்க முடியவில்லை.',
    errorGeneric: 'AI உதவியாளருடன் தொடர்பு கொள்ள முடியவில்லை.',
    suggestedPrompts: [
      'தீ விபத்தின் போது நான் என்ன செய்ய வேண்டும்?',
      'சாலை விபத்துக்குப் பிறகு என்ன நடவடிக்கைகள் எடுக்க வேண்டும்?',
      'திடீர் வெள்ளத்தின் போது நான் எப்படி பாதுகாப்பாக இருக்கலாம்?',
      'கடுமையான இரத்தப்போக்குக்கான முதலுதவி',
      '4 அவசர தீவிர நிலைகள் என்ன?',
    ],
  },
  te: {
    subtitle: '24/7 AI ఆధారిత విపత్తు & భద్రతా మార్గదర్శకం',
    clear: 'క్లియర్',
    safetyNotice:
      'AI స్పందనలు సాధారణ సమాచారం కోసం. నిజమైన అత్యవసర సహాయం కోసం ఎల్లప్పుడూ అధికారులను సంప్రదించండి లేదా 112కి కాల్ చేయండి.',
    loading: 'అత్యవసర సహాయకుడు భద్రతా ప్రోటోకాల్‌లను విశ్లేషిస్తోంది...',
    suggested: 'సూచించిన అత్యవసర ప్రశ్నలు',
    placeholder: 'తరలింపు, ప్రథమ చికిత్స, విపత్తు చర్యల గురించి అడగండి...',
    greeting:
      'నమస్కారం! నేను మీ అత్యవసర AI సహాయకుడిని. భద్రతా ప్రోటోకాల్‌లు, విపత్తు సన్నద్ధత మరియు అత్యవసర పరిస్థితులను ఎలా నివేదించాలో మార్గనిర్దేశం చేయగలను.\n\n⚠️ **ముఖ్యం**: ప్రాణానికి తక్షణ ముప్పు ఉంటే, ఎల్లప్పుడూ మొదట స్థానిక అత్యవసర సేవలను (112 / 100 / 108) సంప్రదించండి.',
    errorNoResponse: 'AI సహాయకుడు స్పందనను రూపొందించలేకపోయాడు.',
    errorGeneric: 'AI సహాయకుడితో కమ్యూనికేట్ చేయడంలో విఫలమైంది.',
    suggestedPrompts: [
      'అగ్ని ప్రమాదం సమయంలో నేను ఏమి చేయాలి?',
      'రోడ్డు ప్రమాదం తర్వాత ఏ చర్యలు తీసుకోవాలి?',
      'అకస్మాత్తు వరద సమయంలో నేను ఎలా సురక్షితంగా ఉండగలను?',
      'తీవ్ర రక్తస్రావానికి ప్రథమ చికిత్స',
      '4 అత్యవసర తీవ్రత స్థాయిలు ఏమిటి?',
    ],
  },
}

function getStrings(language: string): ChatStrings {
  return CHAT_STRINGS[language] ?? CHAT_STRINGS[DEFAULT_AI_LANGUAGE]
}

export default function AssistantPage() {
  const { appUser } = useAuth()
  const [languageOverride, setLanguageOverride] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [provider, setProvider] = useState<'groq' | 'ollama' | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // User-selected language wins, otherwise fall back to their saved profile preference
  const language = languageOverride ?? appUser?.preferredLanguage ?? DEFAULT_AI_LANGUAGE
  const t = getStrings(language)
  const conversation: ChatMessage[] = [
    { role: 'assistant', content: t.greeting },
    ...messages,
  ]

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSend(text?: string) {
    const query = text || input.trim()
    if (!query || loading) return

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: query }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, language }),
      })

      const data = await res.json()
      if (data.reply) {
        setMessages([...newMessages, { role: 'assistant', content: data.reply }])
        setProvider(data.provider === 'ollama' ? 'ollama' : 'groq')
      } else {
        toast.error(t.errorNoResponse)
      }
    } catch (err) {
      console.error(err)
      toast.error(t.errorGeneric)
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setMessages([])
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Bot size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#101b2d] flex items-center gap-2">
              Emergency AI Assistant
              <span className="text-[10px] bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
                {provider === 'ollama' ? 'Ollama gemma2:2b' : 'Groq + Ollama'}
              </span>
            </h1>
            <p className="text-xs text-slate-500">{t.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg px-2.5 py-1.5">
            <Globe size={14} className="text-slate-500" />
            <select
              value={language}
              onChange={(e) => setLanguageOverride(e.target.value)}
              aria-label="Assistant language"
              className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              {AI_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <Button variant="ghost" size="sm" onClick={handleReset} className="text-slate-500 hover:text-slate-800">
            <RotateCcw size={14} /> {t.clear}
          </Button>
        </div>
      </div>

      {/* Safety Notice strip */}
      <div className="py-2 px-3 bg-amber-50/70 border border-amber-200/60 rounded-lg text-[11px] text-amber-800 flex items-center gap-2 my-3 shrink-0">
        <AlertTriangle size={14} className="text-amber-600 shrink-0" />
        <span>{t.safetyNotice}</span>
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-2">
        {conversation.map((m, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 ${
              m.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={16} />
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-[75%] p-4 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'chat-bubble-user text-white'
                  : 'chat-bubble-ai bg-white shadow-sm'
              }`}
            >
              {m.content}
            </div>

            {m.role === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-[#101b2d] text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                <User size={15} />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Bot size={16} />
            </div>
            <div className="chat-bubble-ai p-4 bg-white shadow-sm flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              {t.loading}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts (if chat is fresh) */}
      {messages.length === 0 && (
        <div className="py-2 shrink-0">
          <p className="text-[11px] font-semibold uppercase text-slate-400 mb-1.5 flex items-center gap-1">
            <Sparkles size={12} className="text-amber-500" /> {t.suggested}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {t.suggestedPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleSend(prompt)}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full transition-colors text-left"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Input Bar */}
      <div className="pt-3 border-t border-slate-200 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.placeholder}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button
            type="submit"
            variant="primary"
            disabled={loading || !input.trim()}
            className="h-10 px-5 shrink-0"
          >
            <Send size={16} />
          </Button>
        </form>
      </div>
    </div>
  )
}
