# Disrec

Disrec is an AI-assisted emergency response and disaster-management platform. Citizens can report emergencies, request SOS support, receive alerts, find safe shelters, and monitor local risks. Emergency operators use a command center for triage, dispatch, public alerts, and operational insight.

> AI output is advisory only. Critical decisions must be verified by authorized emergency personnel.

## Features

### Citizens

- Report emergencies with location, category, evidence, and severity details
- Trigger and track SOS requests
- View live incidents, nearby alerts, notifications, and safety guidance
- Use the AI emergency assistant and voice-assisted reporting
- Track linked family safety profiles
- Find an open, safe shelter and open walking directions in Google Maps

### Emergency operators

- Review, verify, assign, and update incidents
- Monitor SOS requests and response activity
- Publish emergency broadcasts and alerts
- Manage response teams, availability, and dispatch assignments
- Create shelter points with location, occupancy, capacity, amenities, and status
- Use heatmaps, analytics, AI summaries, recommendations, and incident chat
- Manage users, administrators, notifications, and settings

## Technology

| Area | Tools |
| --- | --- |
| Framework | Next.js 16, React 19, TypeScript |
| UI | Tailwind CSS, Lucide, Framer Motion, Sonner |
| Data and auth | Firebase Authentication, Firestore, Storage |
| Maps | Leaflet, React Leaflet, OpenStreetMap |
| AI | Groq API with optional Ollama chat fallback |
| Analytics | Recharts |

## Project structure

```text
app/
  (auth)/             Authentication routes
  (public)/           Citizen-facing routes
  admin/              Protected command center
  api/ai/             Server-side AI endpoints
components/           Shared UI, maps, auth, reporting, and layouts
lib/                  Firebase, data access, AI, shelter, and domain modules
firestore.rules       Firestore authorization rules
storage.rules         Storage authorization rules
```

## Quick start

### Prerequisites

- Node.js 20.9+
- npm 10+
- Firebase project with Email/Password authentication enabled
- Groq API key for AI features

```bash
git clone <your-repository-url>
cd my-app
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

## Environment variables

Create `.env.local`. Never commit it or any service-account credentials.

```bash
# Firebase web app configuration
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# AI provider
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile

# Optional local fallback for chat
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma2:2b
OLLAMA_TIMEOUT_MS=120000
```

## Firebase setup

1. Create a Firebase project and register a web app.
2. Enable **Authentication > Email/Password**.
3. Create a Cloud Firestore database and configure Storage if users upload evidence.
4. Add the Firebase web configuration to `.env.local`.
5. Review and deploy the repository rules:

```bash
firebase deploy --only firestore:rules,storage
```

Firestore stores users, incidents, incident updates, SOS requests, notifications, emergency alerts, response teams, shelters, and administrator audit logs. Local seed data provides an offline/demo fallback for selected workflows.

## Roles

| Role | Access |
| --- | --- |
| `user` | Citizen workflows, alerts, maps, profile, and evacuation guidance |
| `admin` | Full command center |
| `super_admin` | Command center and administrator management |
| `incident_manager` | Incident response operations |
| `monitoring_admin` | Monitoring workflows |
| `alert_manager` | Alert workflows |

## Shelter and evacuation flow

1. An admin publishes a shelter location, capacity, occupancy, operational status, amenities, and contact details in **Admin > Shelter Points**.
2. Firestore syncs the shelter directory to authenticated citizens.
3. The citizen opens **Shelters**, shares their location, and receives recommendations based on distance, spare capacity, and active-incident caution zones.
4. Google Maps provides walking directions to the selected shelter.

## AI endpoints

| Endpoint | Purpose |
| --- | --- |
| `POST /api/ai/classify` | Suggest incident severity |
| `POST /api/ai/quick-report` | Extract a structured emergency report from a conversation |
| `POST /api/ai/summarize` | Summarize an incident for operators |
| `POST /api/ai/recommend` | Generate operational recommendations |
| `POST /api/ai/analyze` | Analyze patterns, hotspots, and report quality |
| `POST /api/ai/chat` | Emergency assistant and incident-context chat |

AI calls are handled server-side, so `GROQ_API_KEY` is never exposed to the browser. Chat can use Ollama when Groq is unavailable.

## Commands

```bash
npm run dev      # Start development mode
npm run lint     # Run ESLint
npm run build    # Create a production build
npm run start    # Serve the production build
```

## Production checklist

- Use separate Firebase projects for development, staging, and production.
- Deploy and test Firestore and Storage rules before launch.
- Keep server-only secrets out of `NEXT_PUBLIC_*` variables.
- Add rate limiting, request validation, monitoring, and audit-retention policies.
- Treat locations, identity data, medical information, and evidence uploads as sensitive.
- Verify all AI-generated guidance and emergency decisions with qualified personnel.

## Contributing

1. Create a branch with the `codex/` prefix.
2. Keep changes focused and type-safe.
3. Run `npm run lint` and `npm run build` before opening a pull request.
4. Update this README for new capabilities, variables, or operations dependencies.

## License

No license is currently declared. Add one before distributing the project or accepting external contributions.
