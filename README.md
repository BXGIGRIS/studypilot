# 📚 StudyPilot

A free, web-based study tool. Upload PDFs, ask questions, get answers cited to the page.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A Supabase account (free tier)
- A Groq API key (free at groq.com)

### Setup

1. **Clone or download the project**
   ```bash
   git clone <your-repo>
   cd <project-folder>
   ```
   On this machine the checked-out project lives at `N:\studypilot`.

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project at https://supabase.com
   - Get your Project URL and Anon Key from Settings → API
   - Copy `.env.example` to `.env.local` and fill in your values:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
     ```

4. **Create the database schema**
   - Go to Supabase SQL Editor
   - Run the SQL from `setup-db.sql` (see below)

5. **Run the dev server**
   ```bash
   npm run dev
   ```
   Visit http://localhost:3000

## 📊 Database Setup

Run this SQL in your Supabase SQL Editor:

```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  tier TEXT DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  page_count INT,
  status TEXT DEFAULT 'processing',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create chunks table
CREATE TABLE chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  page_number INT,
  content TEXT NOT NULL,
  embedding vector(384),
  chunk_index INT
);

-- Create chats table
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  document_ids TEXT[],
  title TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  citations JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create usage table
CREATE TABLE usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  date DATE,
  uploads_count INT DEFAULT 0,
  questions_count INT DEFAULT 0,
  tokens_used INT DEFAULT 0
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for documents
CREATE POLICY "Documents: Users can see own documents"
  ON documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Documents: Users can insert own documents"
  ON documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Documents: Users can update own documents"
  ON documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Documents: Users can delete own documents"
  ON documents FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for chunks
CREATE POLICY "Chunks: Users can see own chunks"
  ON chunks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Chunks: Users can insert own chunks"
  ON chunks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Chunks: Users can update own chunks"
  ON chunks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Chunks: Users can delete own chunks"
  ON chunks FOR DELETE
  USING (auth.uid() = user_id);

-- Similar policies for chats and messages...
-- (Create similar patterns for each table)

-- Create indexes for better performance
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_chunks_document_id ON chunks(document_id);
CREATE INDEX idx_chunks_user_id ON chunks(user_id);
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
```

6. **Set up storage**
   - In Supabase, go to Storage
   - Create a new bucket called `documents`
   - Set it to private with RLS enabled
   - Add this RLS policy:
     ```
     Files are stored under user_id directory, only authenticated users can read their own
     ```

## 🔑 How It Works

1. **Login** — Magic link authentication (email only, no password)
2. **Upload** — Select a PDF, it's automatically parsed and chunked
3. **Embeddings** — Chunks are embedded using transformers.js (browser-side, free)
4. **Search** — Vector search finds relevant chunks based on your question
5. **Answer** — Groq API generates answers with citations to the source pages
6. **Learn** — Quiz generation coming soon 🚀

## 🛠️ Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Database**: Supabase (Postgres + pgvector)
- **Storage**: Supabase Storage
- **Auth**: Supabase Auth (magic links)
- **PDF Parsing**: PDF.js (Mozilla)
- **Embeddings**: Transformers.js (Hugging Face) + all-MiniLM-L6-v2
- **LLM**: Groq API (free tier)
- **Vector Search**: pgvector (PostgreSQL extension)

## 🚢 Deployment

### Deploy to Cloudflare Pages (recommended)

1. Push your code to GitHub
2. Go to https://pages.cloudflare.com
3. Connect your GitHub repo
4. Set build command: `npm run build`
5. Set build output directory: `.next`
6. Add environment variables (your Supabase keys)
7. Deploy!

### Deploy to Vercel

1. Push to GitHub
2. Go to https://vercel.com and import your repo
3. Add environment variables
4. Deploy!

## 📝 Environment Variables

Create `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🎯 Features

### MVP (Phase 1)
- ✅ Magic link login
- ✅ PDF upload & parsing
- ✅ Text extraction & chunking
- ✅ Browser-side embeddings
- ✅ Vector search
- ✅ Chat with citations
- ✅ Groq API integration

### Coming Soon (Phase 2)
- Quiz generation
- Flashcards with spaced repetition (SM-2 algorithm)
- Document summaries
- "Explain like I'm 5" mode
- Multi-document chat

## 💰 Cost Breakdown

- **Hosting**: $0/mo (Cloudflare Pages)
- **Database**: $0/mo (Supabase free tier)
- **Embeddings**: $0/mo (browser-side)
- **LLM**: $0/mo (Groq free tier)
- **Total**: **$0/mo**

## 🤝 Contributing

Ideas? Found a bug? Open an issue or submit a PR!

## 📄 License

MIT

## 🙌 Shout-out

Built to help students study better. Free forever. No paywalls. No BS.

---

Made with ❤️ for students everywhere.
