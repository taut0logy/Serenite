# AGENTS.md - Serenite

Mental health support platform: Next.js frontend + FastAPI AI backend.

## Quick Start

```bash
# Terminal 1 - Client (Next.js)
cd client
npm install
npx prisma generate
npx prisma db push
npm run dev        # http://localhost:3000

# Terminal 2 - Agents (FastAPI)
cd agents
# Option A: uv (preferred)
uv sync --frozen
source .venv/bin/activate  # Windows: .venv\Scripts\activate
python main.py             # http://localhost:8000

# Option B: pip
pip install -r requirements.txt
python main.py
```

## Architecture Overview

```md
Serenite/
├── client/                 # Next.js 16+ (Node.js 20+)
│   ├── src/
│   │   ├── app/         # Next.js App Router
│   │   │   ├── (protected)/    # Auth-required routes (wrapped in StreamVideoProvider)
│   │   │   │   ├── dashboard/
│   │   │   │   ├── mental-health-assistant/
│   │   │   │   │   └── feedback/     # Assistant feedback UI
│   │   │   │   │   └── resources/    # Mental health resources
│   │   │   │   ├── diary/
│   │   │   │   ├── community/
│   │   │   │   │   └── [postId]/     # Individual post view
│   │   │   │   ├── questionnaire/
│   │   │   │   ├── moner-canvus/     # Canvas drawing analysis
│   │   │   │   ├── moner-canvas/     # Alternative spelling alias
│   │   │   │   ├── meeting/[id]/     # Video meeting room
│   │   │   │   ├── breathing-exercise/  # Guided breathing
│   │   │   │   ├── profile/          # User profile
│   │   │   │   ├── recordings/     # Past meeting recordings
│   │   │   │   ├── groups/join/[shareableId]/  # Support group joining
│   │   │   │   ├── settings/         # Settings hub
│   │   │   │   │   ├── password/     # Password change
│   │   │   │   │   └── security/     # 2FA, trusted devices
│   │   │   │   └── layout.tsx        # Protected layout with StreamVideoProvider
│   │   │   ├── auth/            # Public auth routes
│   │   │   │   ├── login/
│   │   │   │   ├── register/
│   │   │   │   ├── forgot-password/
│   │   │   │   ├── reset-password/[token]/
│   │   │   │   ├── verify-email/[token]/
│   │   │   │   ├── verify-otp/
│   │   │   │   ├── verify-request/
│   │   │   │   ├── set-password/     # Social auth password setup
│   │   │   │   ├── kyc-verification/
│   │   │   │   ├── kyc-testing/
│   │   │   │   └── error/
│   │   │   ├── api/
│   │   │   │   ├── auth/[...nextauth]/  # NextAuth v5
│   │   │   │   ├── graphql/       # Yoga GraphQL endpoint
│   │   │   │   ├── proxy/[...path]/     # FastAPI proxy (attaches auth token)
│   │   │   │   ├── token/verify/        # JWT verification for agents
│   │   │   │   ├── token/route.ts       # Token endpoint
│   │   │   │   ├── webhooks/stream/     # Stream video webhooks
│   │   │   │   ├── email/send-verification/
│   │   │   │   ├── email/send-otp/
│   │   │   │   ├── email/send-password-reset/
│   │   │   │   ├── email/send-meeting-invitation/
│   │   │   │   └── meetings/[meetingId]/{heartbeat,join}/
│   │   │   ├── layout.tsx       # Root layout with Providers
│   │   │   ├── page.tsx         # Landing page
│   │   │   └── globals.css      # Global styles + Tailwind
│   │   ├── components/
│   │   │   ├── ui/              # 50+ ShadCN/Radix components
│   │   │   │   ├── accordion.tsx → tooltip.tsx
│   │   │   │   ├── button.tsx, button-dashboard.tsx
│   │   │   │   ├── card.tsx, card-dashboard.tsx
│   │   │   │   ├── form.tsx, form-dashboard.tsx
│   │   │   │   ├── input.tsx, input-dashboard.tsx
│   │   │   │   ├── label.tsx, label-dashboard.tsx
│   │   │   │   ├── loading-screen.tsx, modal.tsx
│   │   │   │   └── sonner.tsx (toast), theme-toggle.tsx
│   │   │   ├── mental-health-assistant/
│   │   │   │   ├── chat-message.tsx
│   │   │   │   ├── emotion-insights.tsx
│   │   │   │   ├── emotion-journal.tsx
│   │   │   │   ├── facial-emotion-capture.tsx
│   │   │   │   ├── thinking-process.tsx
│   │   │   │   ├── voice-assistant-modal.tsx
│   │   │   │   └── voice-emotion-capture.tsx
│   │   │   ├── moner-canvus/
│   │   │   │   ├── AnalysisPanel.tsx
│   │   │   │   ├── CanvasPane.tsx
│   │   │   │   ├── FaceTracker.tsx
│   │   │   │   └── SessionHistory.tsx
│   │   │   ├── meeting/
│   │   │   │   ├── call-controls.tsx, device-controls-panel.tsx
│   │   │   │   ├── chat-input.tsx, chat-message.tsx, chat-toast.tsx
│   │   │   │   ├── end-call-button.tsx, speaking-indicator.tsx
│   │   │   │   ├── group-chat-panel.tsx
│   │   │   │   ├── meeting-countdown.tsx, meeting-invite.tsx
│   │   │   │   ├── meeting-modal.tsx, meeting-room.tsx, meeting-setup.tsx
│   │   │   │   ├── meeting-type-list.tsx
│   │   │   │   ├── participants-list.tsx, waiting-room.tsx
│   │   │   │   └── loader.tsx, home-card.tsx
│   │   │   ├── community/
│   │   │   │   ├── post-card.tsx, post-list.tsx
│   │   │   │   ├── comment-form.tsx, comment-list.tsx
│   │   │   │   ├── comment-edit-form.tsx
│   │   │   │   ├── create-post-button.tsx
│   │   │   │   └── edit-post-dialog.tsx
│   │   │   ├── diary/
│   │   │   │   ├── editor.tsx (TipTap)
│   │   │   │   ├── diary-insights.tsx, diary-sidebar.tsx
│   │   │   │   ├── mood-analysis.tsx, mood-chart.tsx
│   │   │   │   ├── reflection-prompts.tsx
│   │   │   │   └── resizable-image.tsx
│   │   │   ├── questionnaire/
│   │   │   │   ├── questionnaire-layout.tsx, questionnaire-slide.tsx
│   │   │   │   ├── questionnaire-intro.tsx, questionnaire-completion.tsx
│   │   │   │   ├── questionnaire-review.tsx
│   │   │   │   ├── questionnaire-password-prompt.tsx
│   │   │   │   └── SafeWordDisplay.tsx
│   │   │   ├── navigation/
│   │   │   │   ├── navbar.tsx, user-menu.tsx
│   │   │   │   ├── nav-main.tsx, nav-projects.tsx, nav-user.tsx
│   │   │   │   └── mode-toggle.tsx
│   │   │   ├── sections/         # Landing page sections
│   │   │   │   ├── hero.tsx, features.tsx
│   │   │   │   ├── how-it-works.tsx
│   │   │   │   ├── testimonials.tsx
│   │   │   │   ├── cta.tsx, faq.tsx
│   │   │   ├── auth/
│   │   │   │   └── back-button.tsx
│   │   │   ├── kyc/
│   │   │   │   └── kyc-status.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── test-meeting-card.tsx
│   │   │   └── support-group-recommendations.tsx
│   │   ├── lib/
│   │   │   ├── generated/prisma/   # Prisma client output (custom path)
│   │   │   ├── apollo-client.ts    # GraphQL client config
│   │   │   ├── auth.ts            # Auth helpers (currentUser)
│   │   │   ├── prisma.ts          # Prisma singleton with pg adapter
│   │   │   ├── utils.ts           # cn(), formatDate(), formatTime()
│   │   │   ├── axios.ts           # Axios config
│   │   │   ├── crypto.ts          # Crypto utilities
│   │   │   ├── encryption.ts      # AES-GCM client-side encryption
│   │   │   ├── key-management.ts  # Master key, KEK derivation, safe words
│   │   │   ├── internal-api-guard.ts  # X-Internal-API-Key validation
│   │   │   ├── email-api.ts       # Email service API
│   │   │   ├── diary-api.ts       # Diary API wrapper
│   │   │   ├── breathing-api.ts   # Breathing exercise API
│   │   │   ├── test-app-api.ts    # Test utilities
│   │   │   ├── menu-list.ts       # Navigation menu config
│   │   │   ├── searchparams.ts    # URL search param helpers
│   │   │   ├── session-utils.ts   # Session management utilities
│   │   │   └── support-group-utils.ts  # Group matching logic
│   │   ├── providers/
│   │   │   ├── Providers.tsx       # Root provider composition
│   │   │   ├── auth-provider.tsx   # Auth context + RBAC
│   │   │   ├── encryption-provider.tsx  # Master key session context
│   │   │   ├── apollo-provider.tsx # Apollo Client wrapper
│   │   │   ├── stream-video-provider.tsx  # Stream Video SDK
│   │   │   └── socket-provider.tsx # Socket.io context
│   │   ├── actions/              # Next.js Server Actions
│   │   │   ├── auth.actions.ts       # Login, register, 2FA, OAuth
│   │   │   ├── questionnaire.actions.ts
│   │   │   ├── key-management.actions.ts  # Encryption key storage
│   │   │   ├── kyc.actions.ts, kyc.server.actions.ts
│   │   │   ├── chat.actions.ts
│   │   │   ├── stream.actions.ts    # Stream token generation
│   │   │   ├── meeting.actions.ts
│   │   │   ├── support-group.actions.ts
│   │   │   ├── community.actions.ts
│   │   │   ├── dashboard.actions.ts
│   │   │   ├── notification.actions.ts
│   │   │   └── email.actions.ts
│   │   ├── graphql/
│   │   │   ├── index.ts            # Schema assembly
│   │   │   ├── types/index.ts      # Type definitions (gql)
│   │   │   └── resolvers/          # Resolvers (minimal)
│   │   ├── hooks/               # Custom React hooks
│   │   │   ├── use-auth.tsx
│   │   │   ├── use-questionnaire.ts
│   │   │   ├── use-group-chat.ts
│   │   │   ├── use-vapi.ts
│   │   │   ├── use-kyc.ts
│   │   │   ├── use-encryption.ts (via provider)
│   │   │   ├── use-rbac.tsx
│   │   │   ├── use-mobile.tsx
│   │   │   ├── use-debounce.tsx
│   │   │   ├── use-multistep-form.tsx
│   │   │   ├── use-confirm-password.tsx
│   │   │   ├── use-controllable-state.tsx
│   │   │   ├── use-callback-ref.tsx
│   │   │   ├── use-chat-notifications.ts
│   │   │   └── useGetCallById.ts
│   │   ├── types/             # TypeScript definitions
│   │   │   ├── index.ts       # User type
│   │   │   ├── next-auth.d.ts # Session/JWT extensions
│   │   │   ├── questionnaire.ts
│   │   │   ├── diary.ts
│   │   │   ├── moner-canvus.ts
│   │   │   └── graphql.ts
│   │   ├── schemas/           # Zod validation schemas
│   │   │   └── index.ts
│   │   ├── stores/            # Zustand state stores
│   │   │   └── use-questionnaire-store.ts
│   │   ├── services/          # External service integration
│   │   │   └── key-management.service.ts
│   │   ├── data/              # Static data
│   │   │   ├── questionnaire.ts
│   │   │   └── symptom-cluster.ts
│   │   └── constants/
│   │       └── mock-api.ts
│   ├── auth.ts                # NextAuth v5 configuration
│   ├── auth.config.ts         # NextAuth base config
│   └── prisma/
│       ├── schema.prisma      # 536 lines, 20+ models
│       ├── seed-users.ts      # User seeding
│       ├── seed-groups.ts     # Support group seeding
│       └── migrations/
│
├── agents/                  # FastAPI Python 3.12+
│   ├── main.py             # Entry point, router registration
│   ├── config/
│   │   ├── settings.py     # Pydantic settings (auto-converts postgres://)
│   │   └── limiter.py      # slowapi rate limiting
│   ├── api/                # FastAPI routers (all prefixed /api/v1)
│   │   ├── profiling.py    # Mental health questionnaire analysis
│   │   ├── chat.py         # LangGraph AI assistant
│   │   ├── diary.py        # Journal analysis
│   │   ├── emotion.py      # Face/voice emotion detection
│   │   ├── kyc.py          # AWS Rekognition face verification
│   │   ├── moner_canvus.py # Gemini drawing analysis
│   │   └── breathing.py    # Breathing exercise generation
│   ├── services/           # AI/ML implementations
│   │   ├── mental_health_assistant.py  # LangGraph agent (1200+ lines)
│   │   ├── mental_profiling.py         # 7-domain assessment
│   │   ├── moner_canvus_gemini.py      # Gemini drawing analysis
│   │   ├── emotion_detection.py
│   │   ├── aws_rekognition_adapter.py
│   │   ├── aws_voice_sentiment_adapter.py
│   │   ├── embeddings_adapter.py       # Cohere/HuggingFace fallback
│   │   └── diary_pg.py                 # PostgreSQL vector store
│   ├── middleware/
│   │   └── auth.py         # JWT verification via Next.js REST endpoint
│   └── models/             # Pydantic request/response models
│
└── docker-compose.yml      # Production deployment
```

## Essential Commands

**Client (from `client/`):**

```bash
npm run dev           # Dev server with hot reload
npm run build         # Production (runs prisma generate first)
npm run gen           # Regenerate Prisma client only
npm run db:push       # Push schema changes to DB
npm run seed:u        # Seed users (requires ts-node)
npm run seed:g        # Seed support groups
```

**Agents (from `agents/`):**

```bash
python main.py        # Starts FastAPI (auto-reload in dev)
# Uses uvicorn with --workers 4 in production (see Dockerfile)
```

## Environment Setup

Both need `.env` files. Copy from `.env.example`:

**`agents/.env`** (7 required):

```bash
DATABASE_URL=postgresql://...           # Note: postgres:// auto-converts to postgresql://
GROQ_API_KEY=                          # LLM via Groq
TAVILY_API_KEY=                        # Web search
GEMINI_API_KEY=                        # Moner Canvus canvas analysis
AWS_ACCESS_KEY_ID=                     # Rekognition for KYC
AWS_SECRET_ACCESS_KEY=
INTERNAL_API_KEY=                      # Shared secret with Next.js (generate: openssl rand -hex 32)
```

**`client/.env`** (critical):

```bash
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=                       # Generate: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
JWT_SECRET=                            # Different from NEXTAUTH_SECRET
INTERNAL_API_KEY=                      # Shared with agents (generate: openssl rand -hex 32)
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_GRAPHQL_URL=/api/graphql   # GraphQL endpoint

# Stream Video
NEXT_PUBLIC_STREAM_API_KEY=            # GetStream video
STREAM_SECRET_KEY=

# Vapi AI Voice Assistant
NEXT_PUBLIC_VAPI_PUBLIC_KEY=

# OAuth Providers
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Email (Resend)
RESEND_API_KEY=
FROM_EMAIL=                            # e.g., noreply@yourdomain.com

# KYC/Encryption (shared with agents)
ENCRYPTION_SECRET=
```

## Key Technical Details

**Database & ORM:**

- PostgreSQL required. Agents auto-converts `postgres://` → `postgresql://` in settings.py.
- Prisma generates client to `src/lib/generated/prisma` (custom output path).
- Encrypted fields: Questionnaire responses use AES-GCM (encrypted client-side, stored as bytes in `encryptedData` field with `iv` and `salt`).

**Authentication Flow:**

- NextAuth v5 (beta) with JWT strategy + PostgreSQL session storage.
- 2FA via TOTP with trusted device tokens.
- Lockout: 5 failed attempts → 15 min lockout.
- Auth middleware in agents calls `POST /api/token/verify` with `INTERNAL_API_KEY`.
- 30-second TTL cache on token verification to avoid hammering Next.js.

**Provider Hierarchy** (in `src/providers/Providers.tsx`):

```tsx
SessionProvider (NextAuth)
  └── AuthProvider
       └── EncryptionProvider (AES-256-GCM, password-derived KEK)
            └── ApolloWrapper (GraphQL)
                 └── SocketProvider (Socket.io)
                      └── ThemeProvider
                           └── Toaster
```

**Path Aliases** (from `tsconfig.json`):

- `@/*` → `./src/*` - Standard project imports
- `@/components/*` → `./src/components/*`
- `@/lib/*` → `./src/lib/*`
- `@/hooks/*` → `./src/hooks/*`

**Server Actions Architecture**:
All mutations use Next.js Server Actions in `src/actions/`. Actions communicate directly with Prisma (no GraphQL for auth) to minimize round trips. Key actions include:

- `auth.actions.ts` - 1900+ lines covering login, register, 2FA, OAuth, password reset
- `key-management.actions.ts` - Encryption key storage/retrieval
- `questionnaire.actions.ts` - Encrypted questionnaire response storage
- `kyc.actions.ts` / `kyc.server.actions.ts` - AWS Rekognition integration
- `chat.actions.ts` - AI assistant chat via FastAPI
- `stream.actions.ts` - Stream Video token generation
- `meeting.actions.ts` - Meeting CRUD operations
- `support-group.actions.ts` - Group matching algorithm
- `community.actions.ts` - Post/comment CRUD
- `dashboard.actions.ts` - Dashboard data aggregation
- `notification.actions.ts` - Notification management
- `email.actions.ts` - Email sending operations

**Hooks Inventory** (`src/hooks/`):

| Hook | Purpose |
| ------ | --------- |
| `use-auth.tsx` | Authentication state with RBAC |
| `use-questionnaire.ts` | Questionnaire state management |
| `use-group-chat.ts` | Real-time meeting chat |
| `use-vapi.ts` | Vapi AI voice assistant |
| `use-kyc.ts` | KYC document upload status |
| `use-encryption.ts` | Via provider - encryption key lifecycle |
| `use-rbac.tsx` | Role-based access control |
| `use-mobile.tsx` | Mobile viewport detection |
| `use-debounce.tsx` | Debounced values |
| `use-multistep-form.tsx` | Multi-step form navigation |
| `use-confirm-password.tsx` | Password confirmation validation |
| `use-controllable-state.tsx` | Controlled/uncontrolled state |
| `use-callback-ref.tsx` | Callback ref management |
| `use-chat-notifications.ts` | Chat notification badges |
| `useGetCallById.ts` | Stream call fetching |

**AI/ML Stack:**

- **LLM**: Groq (llama-3.3-70b-versatile) via `langchain-groq`
- **Embeddings**: Cohere (`embed-multilingual-v3.0`) for Bangla support, falls back to HuggingFace
- **Agent Framework**: LangGraph (`mental_health_assistant.py`, ~1200 lines)
- **Face Recognition**: AWS Rekognition (KYC verification)
- **Voice Emotion**: AWS Transcribe (bn-IN for Bangla) + Comprehend
- **Drawing Analysis**: Google Gemini API (`moner_canvus_gemini.py`)
- **Audio Processing**: librosa + sounddevice (client-side)

**API Communication:**

- Client → Agents: Via `/api/proxy/[...path]` route which attaches auth headers.
- GraphQL: Yoga server at `/api/graphql` with context from NextAuth session.
- Agents auth: JWT verified against Next.js `/api/token/verify` endpoint.

## API Structure (Agents)

All routes prefixed with `/api/v1`, rate-limited with slowapi:

| Endpoint | Purpose |
| ---------- | --------- |
| `POST /profiling` | 7-domain mental health assessment (PHQ-9, GAD-7 style) |
| `POST /chat` | LangGraph AI assistant with memory, tools (Wikipedia, Arxiv, YouTube, Tavily) |
| `POST /diary/analyze` | Journal mood analysis with Groq + PostgreSQL vector storage |
| `POST /emotion/detect-face-emotion` | AWS Rekognition (prod) / DeepFace (dev) |
| `POST /emotion/analyze-voice` | AWS Transcribe + Comprehend with Bangla support |
| `POST /emotion-journal` | Emotion tracking with pattern analysis |
| `POST /breathing/generate` | Personalized breathing exercises via LangGraph |
| `POST /moner-canvus/sessions` | Gemini-powered drawing + emotion snapshot analysis |
| `POST /kyc/upload-images` | Face matching between selfie and ID card |
| `POST /feedback` | User feedback on assistant responses |

## Build & Deployment

**Docker:**

- Client: `output: "standalone"` in `next.config.ts` for minimal Docker image
- Agents: Multi-stage build with `uv` dependency resolution, healthcheck on `/health`
- Compose requires `.env.agents` and `.env.client` (different from `.env`)

**Port Conflicts:**

- Client: 3000 (Next.js)
- Agents: 8000 (FastAPI)
- PostgreSQL: 5432

**File Uploads:**

- KYC images: `services/uploads/` (volume mounted in Docker)
- Max size: 10MB
- Allowed: `.txt`, `.jpg`, `.jpeg`, `.png`, `.pdf`

## Testing

No automated test suite configured. Manual verification:

1. `GET http://localhost:8000/health` → `{"status": "healthy"}`
2. `GET http://localhost:3000` → Next.js homepage
3. `/api/proxy/health` → Proxied health check from agents

## Data Flow Examples

**Chat Flow:**

```md
Client → POST /api/proxy/chat
       ↓
Next.js /api/proxy attaches auth token
       ↓
Agents middleware validates JWT (cached 30s)
       ↓
Chat router → MentalHealthAssistant (LangGraph)
       ↓
Groq LLM + tools → Response
```

**Questionnaire Flow:**

```md
Client fills form → Client-side AES-GCM encryption
       ↓
Server Action saveQuestionnaireResponses
       ↓
Prisma stores encrypted bytes (encryptedData, iv, salt)
       ↓
Agents profiling analyzes decrypted data
       ↓
MentalHealthProfile scores stored in PostgreSQL
```

## Important Conventions

- **Path aliases**: `@/*` maps to `./src/*` (tsconfig.json)
- **Server Actions**: All mutations use Next.js Server Actions in `src/actions/`
- **Encryption**: Master key derived from password via PBKDF2 (600k iterations)
- **Safe Words**: 12-word BIP-39 style recovery phrase for encryption key recovery
- **Rate Limiting**: In-memory slowapi (use Redis for multi-instance)
- **Chat History**: In-memory storage with 100 user limit in agents
