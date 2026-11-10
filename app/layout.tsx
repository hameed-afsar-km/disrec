// app/layout.tsx
// Root layout — provides fonts, auth context, and toast notifications
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/components/auth/AuthProvider'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'RespondAI — Emergency Response Platform',
    template: '%s | RespondAI',
  },
  description:
    'AI-powered Emergency Response & Disaster Management Platform. Report emergencies, request SOS assistance, monitor live incidents, and receive real-time alerts.',
  keywords: ['emergency', 'disaster management', 'SOS', 'incident reporting', 'emergency response'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            richColors
            expand={false}
            duration={4000}
            toastOptions={{
              style: {
                fontFamily: 'var(--font-geist-sans)',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  )
}
