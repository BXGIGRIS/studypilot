-- StudyPilot Database Setup
-- Run this in Supabase SQL Editor

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  tier TEXT DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  page_count INT,
  status TEXT DEFAULT 'processing',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create chunks table
CREATE TABLE IF NOT EXISTS chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  page_number INT,
  content TEXT NOT NULL,
  embedding vector(384),
  chunk_index INT
);

-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  document_ids TEXT[],
  title TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
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
CREATE TABLE IF NOT EXISTS usage (
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

-- RLS Policies for documents
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

-- RLS Policies for chunks
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

-- RLS Policies for chats
CREATE POLICY "Chats: Users can see own chats"
  ON chats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Chats: Users can insert own chats"
  ON chats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Chats: Users can update own chats"
  ON chats FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Chats: Users can delete own chats"
  ON chats FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for messages
CREATE POLICY "Messages: Users can see own messages"
  ON messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Messages: Users can insert own messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Messages: Users can update own messages"
  ON messages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Messages: Users can delete own messages"
  ON messages FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for usage
CREATE POLICY "Usage: Users can see own usage"
  ON usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usage: Users can insert own usage"
  ON usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usage: Users can update own usage"
  ON usage FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_chunks_document_id ON chunks(document_id);
CREATE INDEX idx_chunks_user_id ON chunks(user_id);
CREATE INDEX idx_chats_user_id ON chats(user_id);
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_document_id ON messages(document_id);
CREATE INDEX idx_usage_user_id ON usage(user_id);

-- Create vector index for similarity search
CREATE INDEX idx_chunks_embedding ON chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Search chunks in Postgres instead of pulling every chunk into the browser
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(384),
  match_count INT,
  match_document_id UUID
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  document_id UUID,
  page_number INT,
  content TEXT,
  embedding vector(384),
  chunk_index INT,
  similarity FLOAT
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    chunks.id,
    chunks.user_id,
    chunks.document_id,
    chunks.page_number,
    chunks.content,
    chunks.embedding,
    chunks.chunk_index,
    1 - (chunks.embedding <=> query_embedding) AS similarity
  FROM chunks
  WHERE chunks.document_id = match_document_id
    AND chunks.user_id = auth.uid()
    AND chunks.embedding IS NOT NULL
  ORDER BY chunks.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Storage policies for the private documents bucket.
-- Create a Supabase Storage bucket named "documents" before running these.
CREATE POLICY "Storage: Users can read own documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Storage: Users can upload own documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Storage: Users can update own documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Storage: Users can delete own documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
