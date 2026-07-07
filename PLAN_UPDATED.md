# StudyPilot — Master Plan (Updated with Free Stack)

> A free, web-based study tool. Upload PDFs, ask questions, get answers cited to the page.
> Like ChatGPT, but stripped to your own study material. Built to help students, at $0 cost to launch.
> **2025-2026 reality check: everything here is truly free. No trials, no "free tier that expires".**

---

## 1. Vision

- **Who:** students (solo, school, uni). Anyone with notes/textbooks in PDF.
- **What:** upload documents, chat with them, generate quizzes/flashcards/summaries.
- **Why different from ChatGPT:** answers cite the exact page; scoped only to *your* material; study tools baked in.
- **Cost to launch:** **$0**. Free hosting + free DB + free LLM APIs + free client-side ML.

---

## 2. The zero-cost money model

| Door | Who pays | User effort | You earn | Cost to you |
|------|----------|-------------|----------|------------|
| **Free tier (BYOK)** | user's Groq/Gemini key | paste API key | nothing yet | **$0** |
| **Paid tier (later)** | you (your API key) | zero setup | subscription margin | only when profitable |

**Reality check:** The free tier stays free forever. You only spend money if students want it and you choose to.

---

## 3. Architecture: The Clean Split (Actually Free)

```
┌──────────────────────┐     ┌──────────────────┐     ┌────────────────┐
│   BROWSER            │     │  STATIC HOSTING  │     │  DATABASE      │
│  (all the heavy      │     │  (Cloudflare     │     │  (Supabase     │
│   lifting)           │     │   Pages or       │     │   free tier)   │
│                      │     │   Railway)       │     │                │
├──────────────────────┤     ├──────────────────┤     ├────────────────┤
│ parse PDF.js         │────▶│ serve static JS  │────▶│ store PDFs     │
│ chunk text           │     │ no backend logic │     │ store chunks   │
│ embed (transformers) │     │ just files       │     │ vector search  │
│ vector search        │     │                  │     │ (pgvector)     │
│ LLM call (BYOK key)  │     │                  │     │ RLS protected  │
└──────────────────────┘     └──────────────────┘     └────────────────┘
```

**Who does what:**
- **Browser** (your user's machine): parse PDF, chunk, embed (transformers.js), search vectors, LLM call with their key. *All free, all private, no cost to you.*
- **Hosting** (Cloudflare Pages): serves the static Next.js site. *Unlimited bandwidth free.*
- **Database** (Supabase): stores PDFs, vectors, chats. *500MB free tier = ~50k pages of study material.*

**The magic:** Your server bill is literally $0. The database is your only infrastructure cost, and it's free until you succeed.

---

## 4. Tech stack (everything actually free in 2025-2026)

| Layer | Tool | Cost | Notes |
|-------|------|------|-------|
| **Code home** | GitHub | FREE | unlimited repos, workflows, CI/CD |
| **Hosting** | Cloudflare Pages | FREE | unlimited bandwidth, 100K requests/day via Workers |
| **Database** | Supabase (Postgres) | FREE | 500MB, pgvector included, RLS-protected |
| **Storage** | Supabase Storage | FREE | 1GB files, path-scoped RLS |
| **Auth** | Supabase Auth | FREE | magic links or email/password, no credit card needed |
| **Frontend** | Next.js + React | FREE | open source |
| **PDF parsing** | PDF.js | FREE | Mozilla's open source, runs in browser |
| **OCR** | Tesseract.js v6 | FREE | 100+ languages, browser-side, WebAssembly |
| **Embeddings** | Transformers.js + EmbeddingGemma or all-MiniLM-L6-v2 | FREE | runs in browser, no server cost, 100% private |
| **Vector search** | pgvector (in Supabase) | FREE | built into Postgres, no extra cost |
| **LLM (free tier)** | Groq | FREE | 30 RPM, 6K TPM, 14.4K req/day, no credit card |
| **LLM (alternative)** | Google Gemini API | FREE | generous free tier, ~32K context |
| **Quiz generation** | LLM itself (Groq/Gemini) | FREE | use user's key to generate from PDF text |
| **Flashcards** | SM-2 algorithm (client-side) | FREE | open algorithm, you code it in JS |

---

## 5. The Free LLM Situation (2025-2026 reality)

### Groq (Recommended for MVP)
- **Rate limits:** 30 requests/min, 6K tokens/min, 14.4K requests/day
- **Models:** Mixtral 8x7B, LLaMA 3.1 70B, Gemma 2 9B (free models, no charge)
- **Best for:** quiz generation, summarization, Q&A
- **Sign up:** console.groq.com — no credit card, instant API key
- **Quality:** Very good for student material (fast, accurate enough with citations as safety net)

### Google Gemini API
- **Rate limits:** Varies by model, ~360 requests/day free (plenty for most use cases)
- **Models:** Gemini 1.5 Flash (fast, free), Gemini 1.5 Pro (slower, free tier available)
- **Best for:** advanced reasoning, complex Q&A
- **Sign up:** ai.google.dev — no credit card, instant key
- **Quality:** Excellent, but slower than Groq

### OpenRouter (free models only)
- Has free open models (LLaMA 3, Mixtral) at zero cost if you have credits
- **Not recommended** for this: less reliable free tier than Groq/Gemini

---

## 6. Data model (same as before, but now actually free to store)

Every table has user_id and RLS ON.

```sql
-- All tables with RLS enabled, indexed on user_id
-- Supabase free tier can store ~50k pages of study material
-- (rough: 3KB avg chunk + 1.5KB vector = 4.5KB per chunk)

create table profiles (
  id uuid primary key references auth.users(id),
  email text,
  tier text default 'free',
  created_at timestamp
);

create table documents (
  id uuid primary key,
  user_id uuid references auth.users(id),
  filename text,
  storage_path text,
  page_count int,
  status text,
  created_at timestamp
);

create table chunks (
  id uuid primary key,
  user_id uuid references auth.users(id),
  document_id uuid references documents(id),
  page_number int,
  content text,
  embedding vector(768),
  chunk_index int
);

create table chats (
  id uuid primary key,
  user_id uuid references auth.users(id),
  document_ids text[],
  title text,
  created_at timestamp
);

create table messages (
  id uuid primary key,
  user_id uuid references auth.users(id),
  chat_id uuid references chats(id),
  role text,
  content text,
  citations jsonb,
  created_at timestamp
);

create table usage (
  id uuid primary key,
  user_id uuid references auth.users(id),
  date date,
  uploads_count int,
  questions_count int,
  tokens_used int
);
```

---

## 7. RLS — the absolute firewall

**This is non-negotiable.** Every table gets RLS ON with ownership checks.

```sql
alter table documents enable row level security;

create policy "own_select" on documents
  for select using (auth.uid() = user_id);

create policy "own_insert" on documents
  for insert with check (auth.uid() = user_id);

create policy "own_update" on documents
  for update using (auth.uid() = user_id);

create policy "own_delete" on documents
  for delete using (auth.uid() = user_id);
```

---

## 8. Security checklist

**Tier 1**
1. RLS on every table + storage
2. Auth via Supabase
3. Secrets in env
4. No keys in browser (except user's LLM key)

**Tier 2**
5. File validation — check MIME type, cap size (20MB), cap count (10/day)
6. CSP headers — prevent XSS
7. Rate limits — per user, enforced server-side

**Tier 3**
8. Prompt injection — wrap PDF text in tags: `<document_context>...<end_context>`
9. Key hygiene — sessionStorage only, never localStorage
10. Input validation — sanitize filenames
11. CORS — lock routes to your origin

---

## 9. Feature roadmap

### Phase 0 — Foundation ($0, ~1 week)
- GitHub repo + local dev
- Supabase project (enable pgvector)
- Cloudflare Pages deploy
- Supabase Auth (magic link)
- Protected dashboard

### Phase 1 — Core RAG MVP ($0, ~2 weeks)
- Upload PDF → parse → chunk → embed (transformers.js)
- Vector search → return chunks with page citations
- BYOK LLM call (Groq) → answer with citations

### Phase 2 — Study Tools ($0, ~3 weeks)
- Quiz generator
- Flashcards + SM-2 spaced repetition
- Summary generator
- "Explain like I'm 5" mode

### Phase 3 — Paid Tier (optional, when ready)
- Subscription (you supply key)
- Usage dashboard
- Multi-document chat
- OCR for scanned PDFs

### Phase 4 — Scale (when profitable)
- Move to paid DB if limits hit
- Background jobs for large PDFs
- Mobile/PWA support

---

## 10. The Embedding Situation

**Use transformers.js in the browser:**
- Cost: $0 to you
- Privacy: stays on user's device
- Speed: fast with WebGPU

**Recommended model:**
- `Xenova/all-MiniLM-L6-v2` (384-dim, ~25MB)
- Semantic search quality rivals paid services
- Alternative: EmbeddingGemma (768-dim, even better)

---

## 11. Known hard parts

- **Large PDFs:** 200+ pages can take 30s to parse. Show progress bar. Not a blocker.
- **Scanned PDFs:** Use Tesseract.js (free) but slower (10-30s/page). Text PDFs first.
- **500MB limit:** ~50k pages of notes. When you hit it, upgrade Supabase ($25/mo).
- **Free LLM quality:** Citations are your safety net. Students see the source.
- **Rate limits:** Groq 30 RPM is fine for real usage. Easy to upgrade later.

---

## 12. Concrete first steps

1. Create GitHub repo
2. Set up Supabase + pgvector extension
3. Deploy to Cloudflare Pages (Next.js)
4. Wire Supabase Auth (magic link)
5. Build upload → parse → chunk → embed → store
6. Build ask → search → LLM call → answer with citations
7. Polish & launch MVP

---

## 13. Why this works at $0

| Cost | Amount |
|------|--------|
| Hosting | $0/mo (Cloudflare Pages) |
| Database | $0/mo (Supabase free tier) |
| Embeddings | $0/mo (browser-side) |
| LLM (free tier) | $0/mo (Groq) |
| Your compute | $0/mo (static site only) |
| **TOTAL** | **$0/mo** |

When you scale: upgrade paid tiers, add revenue stream, profit. But you start free. 🚀

---

## Status

**READY TO BUILD.** Everything is locked in. Free stack verified as of July 2026. RLS is the wall. Browser does the lifting. Zero dollars until success.
