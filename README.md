# Serenite

**Adaptive mental health profiling and peer-matched online support groups.**

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.135-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![mediasoup](https://img.shields.io/badge/mediasoup-3.24-orange)](https://mediasoup.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Tests](https://img.shields.io/badge/tests-198%20client%20%7C%2023%20meet-brightgreen)](#tests)

Serenite places people into small peer support groups using an adaptive assessment, then hosts the group's sessions on video infrastructure it runs itself. It was built for settings where clinicians are scarce and a per-minute video bill is the difference between a pilot and a line item.

Two design commitments shape most of the code. Severity language shown to a member comes only from published screening instruments with published cutoffs, and never from the platform's own uncalibrated items. Anything a member writes is encrypted in their browser before it is sent, so the server stores ciphertext it cannot read.

---

## Contents

- [Architecture](#architecture)
- [Features](#features)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Tests](#tests)
- [Repository layout](#repository-layout)
- [Limitations](#limitations)
- [Authors](#authors)
- [License](#license)

---

## Architecture

Three deployable services behind one Postgres instance.

| Service | Stack | Port | Responsibility |
| --- | --- | --- | --- |
| `client/` | Next.js 16, React, Prisma | 3000 | Web app, server actions, assessment engine, matching, auth |
| `agents/` | FastAPI, LangGraph, Python 3.12 | 8000 | Assistant, diary indexing and mood, emotion, KYC |
| `meet/` | Node 22, mediasoup, Socket.IO | 4100 | Selective forwarding unit and signaling |

The client decides who may enter a meeting and mints a short-lived capability token. The meeting service verifies that token locally, with no callback and no database round trip on join, so admission policy stays in Serenite's own database while enforcement happens inside the media path.

```
browser ──► client (Next.js) ──► Postgres + pgvector
   │             │
   │             ├──► agents (FastAPI)   assistant, diary index, mood
   │             └──► join token (120 s, single use)
   │
   └──────► meet (mediasoup SFU) ── verifies token, forwards media
```

---

## Features

### Adaptive assessment

Six domains scored under Samejima's graded response model, with ability estimated by expected a posteriori integration over a 40-point grid. Items are chosen to maximise Fisher information at the running estimate, under content balancing and randomesque exposure control.

- Anchor instruments are administered in full: PHQ-9, GAD-7, PC-PTSD-5. Every severity word displayed traces to one of their published cutoffs.
- Sleep, social connection, and self-worth have no anchor. They produce a matching signal and no severity level at all.
- Precision targets differ by purpose: standard error 0.32 where a severity statement depends on it, 0.45 where the estimate only feeds matching.
- PHQ-9 item 9 is a safety item. It is always administered, never counted toward stopping, and any non-zero answer raises a crisis panel at answer time.
- The trauma domain is gated behind the PC-PTSD-5 exposure question with a content warning and an opt-out.
- Free-text answers are mapped onto the item's own options by a classifier whose output set is closed. Anything outside it returns `UNCLEAR` and re-presents the item.
- Careless responding is estimated from the longest identical run and median response time. A flagged sitting is marked, not discarded.
- Every stored assessment records the parameter set it was scored under, so history can be re-scored rather than silently compared across metrics.

### Support group matching

Groups are scored by distance from the member's trait vector, not by direction. Cosine similarity fails here because all six axes run one way, so any two elevated profiles point the same direction however far apart their severity is.

- A group profile blends a hand-authored seed with the running centroid of current members, weighted by membership count.
- Eligibility is enforced when joining, not only in the recommendation list, so an invite link cannot bypass it.
- A risk-escalated assessment is excluded from peer placement and routed to one-to-one support with a facilitator.
- Groups covering moderate or severe bands require an assigned facilitator before any session can start.
- Recommendations show the domains that produced them rather than a bare score.

### Group sessions

A mediasoup selective forwarding unit that forwards without transcoding.

- Each peer subscribes only to the tiles its layout renders, plus a bounded prefetch, pinned participants, screen shares, and the dominant speaker.
- Spatial layer follows rendered tile width, so a thumbnail receives the small layer and a spotlit tile the full one.
- Audio is selected separately from video, so a person is audible as soon as they speak.
- A two-rung bandwidth governor degrades immediately and recovers only after the link holds for five seconds, so a fluctuating connection does not make the grid oscillate.
- Waiting room, hand raise, reactions, in-session chat, and host controls.
- Join tokens are single use with a 120-second lifetime and a replay guard.

### Assistant and diary

- The assistant is a routed graph of typed nodes: classification, emotion and need analysis, strategy selection, an optional tool step, then generation. Tools include retrieval over a curated corpus in pgvector, web search, and structured psychoeducation generators.
- Crisis handling runs a deterministic pattern check **before** the model is consulted, so a provider outage or a refusal cannot suppress it. Regional contacts are shown with their operating hours.
- Diary entries are encrypted in the browser under the member's own key. The server stores ciphertext and an embedding, never plaintext.
- Semantic search over your own history, plus a mood label with a confidence value from a closed set. Nothing from the diary feeds group matching.

### Platform

- Email and password with verification, OAuth, TOTP two-factor with backup codes, trusted devices, session management.
- Anonymous community posts and comments, breathing exercises, a drawing canvas with emotion capture, and identity verification.
- Opt-in calibration: members may contribute anonymised responses under a per-sitting random key that is never stored against their account. Off by default.

---

## Quick start

### With Docker

```bash
git clone https://github.com/taut0logy/Serenite.git
cd Serenite
cp client/.env.example client/.env
cp agents/.env.example agents/.env
cp meet/.env.example meet/.env
# fill in the values described under Configuration
docker compose up --build
```

The web app is then on `http://localhost:3000`.

### Without Docker

You need Node 22+, Python 3.12+, [uv](https://docs.astral.sh/uv/), and a PostgreSQL instance with the `pgvector` extension.

```bash
# 1. database and web app
cd client
npm install
npx prisma migrate deploy
npm run seed:u && npm run seed:g      # demo users and support groups
npm run dev                           # http://localhost:3000

# 2. AI service
cd ../agents
uv sync
uv run python main.py                 # http://localhost:8000

# 3. meeting service
cd ../meet
npm install
npm run dev                           # ws://localhost:4100
```

`mediasoup` compiles a native worker on install, so `meet` needs a C++ toolchain and Python available at build time.

---

## Configuration

Each service ships a `.env.example` listing every variable it reads. The ones without which nothing works:

| Variable | Service | Notes |
| --- | --- | --- |
| `DATABASE_URL` | client, agents | Postgres with `pgvector` |
| `AUTH_SECRET` | client | NextAuth signing key |
| `INTERNAL_API_KEY` | client, agents | Shared secret between the two |
| `JOIN_TOKEN_SECRET` | client, meet | Must match, or every join is rejected |
| `OPENAI_API_KEY` | client, agents | Any OpenAI-compatible provider |
| `OPENAI_BASE_URL` | client, agents | Defaults to OpenRouter |
| `MEDIASOUP_ANNOUNCED_IP` | meet | Public address peers connect to |

Model choice is configurable per task through `LLM_CLASSIFY_MODEL`, `LLM_CONVERSE_MODEL`, and `LLM_COMPOSE_MODEL`. Point the base URL at Groq, Together, vLLM, Ollama, or an OpenAI account and nothing else changes.

`TAVILY_API_KEY` is optional. Without it the assistant's web search tool is switched off and everything else still runs.

---

## Tests

```bash
cd client && npm test     # 198 tests, 25 files
cd meet   && npm test     # 23 tests
```

A simulation harness for the assessment engine lives in `client/scripts/cat-sim.ts`:

```bash
cd client && npm run sim
```

---

## Repository layout

```
client/          Next.js app
  src/lib/assessment/    CAT engine, item banks, scoring, matching, eligibility
  src/lib/diary/         browser-side encryption, mood metadata
  src/lib/crisis/        canonical crisis resources (source of truth)
  src/actions/           server actions
  prisma/                schema, migrations, seeds
  scripts/               simulation and GRM calibration
agents/          FastAPI service
  api/                   routes
  services/              assistant graph, diary index, mood, crisis, LLM
meet/            mediasoup SFU
  src/sfu/               workers, rooms, consumers, bandwidth governor
  src/signaling/         Socket.IO handlers
  src/auth/              join token verification
docs/            paper and design notes
```

---

## License

Apache License 2.0. See [LICENSE](LICENSE).
