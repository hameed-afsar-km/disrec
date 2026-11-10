// lib/mock-aadhaar.ts
// Client-side helpers for the DEMO-ONLY Aadhaar login flow.
// The raw Aadhaar number is never stored — only a one-way hash is used to
// derive a deterministic synthetic Firebase account for the demo.

export const MOCK_AADHAAR_EMAIL_DOMAIN = 'mock.respondai.local'

/** Strip everything except digits and cap at 12 characters. */
export function sanitizeAadhaar(input: string): string {
  return input.replace(/\D/g, '').slice(0, 12)
}

/** Format a 12-digit number as "1234 5678 9012". */
export function formatAadhaar(input: string): string {
  return sanitizeAadhaar(input).replace(/(\d{4})(?=\d)/g, '$1 ')
}

/** Demo validation only — accepts any 12-digit number. */
export function isValidAadhaar(input: string): boolean {
  return /^\d{12}$/.test(sanitizeAadhaar(input))
}

async function sha256Hex(value: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Mock Aadhaar sign-in requires a secure context (HTTPS or localhost).')
  }
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export interface MockAadhaarCredentials {
  email: string
  password: string
}

/**
 * Derive a deterministic synthetic Firebase account from a demo Aadhaar number.
 * The same input always maps to the same demo account, without persisting the
 * Aadhaar number anywhere.
 */
export async function deriveMockAadhaarCredentials(
  aadhaar: string
): Promise<MockAadhaarCredentials> {
  const digits = sanitizeAadhaar(aadhaar)
  const hash = await sha256Hex(`respondai:mock-aadhaar:v1:${digits}`)

  return {
    email: `demo.${hash.slice(0, 20)}@${MOCK_AADHAAR_EMAIL_DOMAIN}`,
    password: `${hash.slice(0, 32)}-RespondAI-demo`,
  }
}

export function isMockAadhaarEmail(email?: string | null): boolean {
  return !!email && email.endsWith(`@${MOCK_AADHAAR_EMAIL_DOMAIN}`)
}
