// app/page.tsx
// Root page — Redirects to the landing page content served by (public) group
// In Next.js App Router with route groups, app/(public)/page.tsx serves /
// only if app/page.tsx does NOT exist. Since this file exists, it takes priority.
// Therefore this IS the landing page — no redirect needed.
// The landing page content is built here and uses the (public) layout
// via the (public)/layout.tsx wrapping.
// NOTE: We import and use the same public layout implicitly through route group nesting.

// The route group (public) captures:
// / → (public)/page.tsx  [BUT app/page.tsx overrides this]
// /dashboard → (public)/dashboard/page.tsx  [fine, no conflict]

// RESOLUTION: Convert this file into the actual landing page.
// The (public) layout won't apply to this file. 
// We will apply Navbar+Footer manually or move this to (public)/ and delete this file.
// Since we cannot delete, we redirect to have (public) handle it:
import { redirect } from 'next/navigation'

// This redirect would be circular. FINAL decision: 
// Keep this as the root page and NOT use (public)/page.tsx for /.
// The landing page content goes here, with the (public) layout applied by
// wrapping in a component that includes Navbar and Footer.

import LandingPage from './(public)/LandingPage'
export default function Home() {
  return <LandingPage />
}
