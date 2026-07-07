# 🚀 StudyPilot — Quick Start Guide

## 5-Minute Setup

### Step 1: Create Supabase Project (2 min)

1. Go to https://supabase.com and sign up (free)
2. Create a new project
3. Go to **Settings** → **API**
4. Copy your **Project URL** and **Anon Public Key**

### Step 2: Clone & Install (1 min)

```bash
# Clone the project
git clone <your-repo>
cd <project-folder>

# Install dependencies
npm install
```
On this machine the project lives at `N:\studypilot`.

### Step 3: Set Up Environment (1 min)

Create `.env.local` in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=your_project_url_from_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_from_supabase
```

### Step 4: Create Database (1 min)

In your Supabase dashboard:
1. Go to **SQL Editor**
2. Create a new query
3. Copy & paste the SQL from the README section "Database Setup"
4. Click **Run**

That's it! ✅

### Step 5: Run Locally

```bash
npm run dev
```

Visit http://localhost:3000

## How to Use

1. **Sign up** — Enter your email, check for magic link
2. **Upload PDF** — Click upload, select a PDF (text PDFs work best)
3. **Get Groq Key** — Go to https://console.groq.com (free, instant)
4. **Chat** — Enter your Groq key, ask questions about your PDF
5. **Get Answers** — AI responds with page citations! 📖

## First Time Tips

- ✅ Use small PDFs first (10-20 pages) to test
- ✅ Text PDFs work better than scanned PDFs (for now)
- ✅ Questions like "What is..." or "Explain..." work best
- ✅ Answers include page numbers — click to verify

## Free Tier Limits

| Resource | Free Limit | Notes |
|----------|-----------|-------|
| Supabase Database | 500MB | ~50k pages of notes |
| Supabase Storage | 1GB | Your PDF files |
| Groq API | 14.4K req/day | Plenty for real studying |
| Embeddings | Browser-side | Unlimited, runs on your machine |

## Troubleshooting

**"Cannot find module '@xenova/transformers'"**
- Run `npm install` again
- Clear cache: `rm -rf .next node_modules`

**"Groq API error"**
- Make sure you have a valid Groq API key
- Check rate limits: https://console.groq.com

**"PDF upload fails"**
- Use a smaller PDF
- Make sure it's a text PDF (not scanned)
- Check Supabase is configured correctly

**"No results when asking questions"**
- Make sure the PDF is fully uploaded (status shows "Ready")
- Try simpler questions
- Check Supabase chunks table has data

## Deploy to Production

### Cloudflare Pages (recommended)

```bash
# 1. Push to GitHub
git push

# 2. Go to pages.cloudflare.com
# 3. Connect your GitHub repo
# 4. Set build command: npm run build
# 5. Set output directory: .next
# 6. Add your env vars in settings
# 7. Deploy!
```

### Vercel

```bash
# 1. Push to GitHub
# 2. Go to vercel.com
# 3. Import your repo
# 4. Add env vars
# 5. Deploy!
```

## Next Steps

- Customize colors in `tailwind.config.js`
- Add more LLM providers (Gemini, OpenAI, etc.)
- Build quiz generation (Phase 2)
- Add flashcards with spaced repetition

## Need Help?

- Check README.md for full docs
- Review the code — it's well-commented
- Google any errors you see
- Ask in GitHub issues

## The Stack (No Sponsored BS)

- **Next.js** — Best React framework
- **Supabase** — Open source Firebase alternative
- **Groq** — Fastest LLM inference (seriously, try it)
- **Transformers.js** — Run ML in the browser
- **Tailwind CSS** — Fast styling
- **PDF.js** — Mozilla's PDF library

---

**That's it!** You've got a working study app. Now go help your friends. 🚀

Got improvements? PRs welcome!
