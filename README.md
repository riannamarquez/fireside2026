# Postscript

**Some stories are hard to tell, and harder to tell at the right time. Postscript lets immigrant grandparents record voice letters to their family, and decide who hears each one, and when.**

Each recording is a letter. Shared letters are stitched into a family book in the storyteller's own words, with her voice under every passage. Hard stories (an arrest, a depression, a family rift) can be sealed: opened by a chosen person on a chosen day, like Lily on her 18th birthday, or by a trusted keeper "when I'm gone." Only the storyteller can see or change a sealed letter.

Postscript is a designathon project built on Fireside, our hackathon app.

Built at [hackathon name] · October 2026

---

## Demo mode

`VITE_DEMO_MODE` defaults to `true`: the app runs with no backend, on an in-memory store saved to localStorage and seeded with Ama's family (recorded audio goes to IndexedDB). Tap your avatar (top right of the header) for the demo controls: switch the viewer (Ama, Lily, Mei, David), set a fake "today", play the keeper's release, or reset the seed. Set `VITE_DEMO_MODE=false` to use Supabase, after running `supabase/postscript.sql`. Seed audio: `scripts/make-demo-audio.sh` (macOS `say`).

## How it works

1. **Life map.** The storyteller fills out a short timeline once: where they lived, when, and with whom. This becomes the skeleton every memory attaches to.
2. **Record.** One tap, talk for as long as they like. Mandarin, English, or both in the same sentence.
3. **Transcribe and place.** Each memo is transcribed, then tagged with a life stage, people, places, and a year range.
4. **Stitch.** Related memos become a chapter that quotes the storyteller directly and links every sentence back to the original audio.
5. **Review.** Nothing is shared until the storyteller approves, edits, or hides it.
6. **Read.** Family members read approved chapters in order, with the original voice playable under each passage.

## Pages

| Page | What it does |
|---|---|
| Life Map | Onboarding: life stages and the family roster |
| Record | One-tap voice recording and a list of past recordings |
| Memories | All memos with transcripts and tags |
| Review | Storyteller approves, edits, or hides chapters |
| Read | Book-style reader for family members |
| QR | Invite code for relatives to join |

## Tech stack

- **Frontend:** React + Vite (TypeScript)
- **Backend:** FastAPI (Python)
- **Database:** Supabase Postgres
- **File storage:** Supabase Storage (audio)
- **AI:** OpenAI Whisper for transcription, LLM calls for tagging and chapter writing

```
Browser (React + Vite)
   │  /api/*  (Vite dev proxy)
   ▼
FastAPI backend ──► ai.py (Whisper + LLM)
   │
   ├──► Supabase Postgres  (life stages, people, memos, chapters)
   └──► Supabase Storage   (audio files) ──► played directly by the browser
```

## Getting started

### Prerequisites

- Node.js 18+
- Python 3.11+
- A Supabase project
- An OpenAI API key

### 1. Clone and install the frontend

```bash
git clone <repo-url>
cd dt-hackathon
npm install
```

### 2. Set up the backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows (Git Bash): source venv/Scripts/activate
pip install -r requirements.txt
```

Create `backend/.env`:

```
SUPABASE_URL=your-project-url
SUPABASE_SERVICE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-key
```

Frontend environment variables go in the repo root `.env`. See `.env.example` for the names.

> **Never commit `.env` files.** The service-role key bypasses all Supabase security rules and must stay on the backend.

### 3. Set up Supabase

Run this in the Supabase SQL editor:

```sql
create table life_stages (
  id serial primary key, label text, place text,
  start_year int, end_year int, notes text
);
create table people (
  id serial primary key, name text, nickname text, relationship text
);
create table memos (
  id serial primary key, audio_url text, transcript text,
  tags jsonb, stage_id int references life_stages(id),
  created_at timestamptz default now()
);
create table chapters (
  id serial primary key, stage_id int references life_stages(id),
  title text, body jsonb, status text default 'draft'
);
```

Then create a **public** Storage bucket named `memos`.

### 4. Run it

In one terminal (from `backend/`):

```bash
uvicorn main:app --reload --port 8000
```

In another (from the repo root):

```bash
npm run dev
```

Open the URL Vite prints. The dev server uses a self-signed HTTPS certificate so microphone access works, so your browser will show a warning the first time. Click through it.

API docs are at `http://localhost:8000/docs`.

## API

| Method | Endpoint | Description |
|---|---|---|
| GET / POST | `/api/life-map` | Read or save life stages |
| GET / POST | `/api/people` | Read or save the family roster |
| POST | `/api/memos` | Upload audio; transcribes and tags it |
| GET | `/api/memos` | List memos |
| POST | `/api/chapters/generate?stage_id=` | Draft a chapter from a stage's memos |
| PATCH | `/api/chapters/{id}` | Approve, hide, or edit a chapter |
| GET | `/api/chapters` | List chapters (filter by `status`) |

## Design principles

- **Fragments are enough.** A 90-second memo is a complete contribution.
- **Her voice, not the AI's.** Chapters quote the storyteller directly. The AI only adds connecting sentences and never invents events, names, or dates.
- **The storyteller controls the truth.** Every chapter is reviewed before anyone else sees it.
- **Sensitive by default.** Family stories involve arrests, illnesses, and feuds, so nothing is shared without consent.

## What's next

- Gap-filling prompts ("Nothing yet about 1980–1985")
- Reader questions that become the storyteller's next prompt
- Translation: read in English, listen in Mandarin or Taiwanese
- Multi-teller stories, with siblings adding their version of the same event
- Per-chapter audiences, including time-locked releases for future generations

## Team

- [Name] — Backend
- [Name] — AI pipeline
- [Name] — Frontend and product
- [Name] — Content, prompts, and pitch

## Run it (Mac)

Needs **Node 20.19+** (22 recommended: `nvm install 22`) and **Python 3.10+**.

```bash
git clone git@github.com:riannamarquez/fireside2026.git && cd fireside2026
npm run setup        # installs everything, creates backend/.env and .env.local from the templates
```

Fill in the keys (ask Kenza, by DM, never commit them):
- `backend/.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (Supabase → API keys → Secret key), `OPENAI_API_KEY`
- `.env.local`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (Supabase publishable key)

Then:
```bash
npm run check-env    # says which keys are missing (never prints them)
npm start            # backend :8000 + frontend http://localhost:5173 — Ctrl+C stops both
```

Restart `npm start` after changing `backend/.env`; the backend only reads it at startup.

| Page | URL |
|---|---|
| Life Map / Record / Memories / Review / Read | http://localhost:5173 |
| Storytime (kids' book) | Memories → ✨ Storytime on any memory |
| QR for phones | `/qr` (phones need HTTPS, see below) |

**Phones (demo laptop only):** phones only allow the mic over HTTPS. With `npm start` running, run `npm run tunnel` (needs `brew install cloudflared`) and open the `https://….trycloudflare.com/qr` URL it prints. The QR on that page points at the tunnel.

Troubleshooting: `address already in use` on 8000 → the backend is already running, that's fine. `cd: no such file or directory: backend` → you're already in `backend/`, run from the project root.

## AI pipeline (`backend/ai.py`, one `OPENAI_API_KEY`)

| Function | Does |
|---|---|
| `transcribe(data, filename, people)` | gpt-4o-transcribe → transcript in her own language(s), roster names as spelling hints |
| `tag_memo(transcript, life_map, people)` | → `{stage_id, people, themes, summary, place, year_start, year_end, year_is_estimate, unmatched_people, tone, sensitive, sensitivity_reason}` stored in `memos.tags` |
| `write_chapter(stage, memos)` | → `{title, body}`; `body = {passages: [{text, memoId, memoIds, kind, uncertain}], yearRange, openQuestions, sensitive}` |

`passages[].memoId` matches the frontend's `Passage` type. `kind` is `quote` (her words), `narration`, or `connective` (AI-added context). Without `OPENAI_API_KEY` the functions fall back to stubs.

Optional env: `OPENAI_MODEL` (default `gpt-4.1`), `OPENAI_TRANSCRIBE_MODEL` (default `gpt-4o-transcribe`).
