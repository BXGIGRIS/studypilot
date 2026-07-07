import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export type Document = {
  id: string;
  user_id: string;
  filename: string;
  storage_path: string;
  page_count: number;
  status: 'processing' | 'ready' | 'error';
  created_at: string;
};

export type Chunk = {
  id: string;
  user_id: string;
  document_id: string;
  page_number: number;
  content: string;
  embedding: number[];
  chunk_index: number;
};

export type Chat = {
  id: string;
  user_id: string;
  document_ids: string[];
  title: string;
  created_at: string;
};

export type Message = {
  id: string;
  user_id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: { page: number; snippet: string; chunk_id: string }[];
  created_at: string;
};
