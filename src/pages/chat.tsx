import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { embedText } from '@/lib/embeddings';
import { callGroqAPI } from '@/lib/groq';
import type { Message as MessageType, Chunk } from '@/lib/supabase';
import { Send, ArrowLeft, KeyRound, Check, Sparkles, FileText, Loader2 } from 'lucide-react';

export default function Chat() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { doc: docId } = router.query;
  const documentId = Array.isArray(docId) ? docId[0] : docId;
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [input, setInput] = useState('');
  const [sending, setIsSending] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(true);
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentStatus, setDocumentStatus] = useState<'processing' | 'ready' | 'error' | ''>('');
  const [expandedSources, setExpandedSources] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (documentId && user) {
      fetchDocumentAndMessages();
    }
  }, [documentId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchDocumentAndMessages = async () => {
    setLoadError('');

    try {
      const { data: doc, error: docError } = await supabase
        .from('documents')
        .select('filename,status')
        .eq('id', documentId)
        .single();

      if (docError) throw docError;
      if (!doc) throw new Error('Document not found.');

      setDocumentTitle(doc.filename);
      setDocumentStatus(doc.status);

      const { data: msgs, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', user?.id)
        .eq('document_id', documentId)
        .order('created_at', { ascending: true });

      if (msgError) throw msgError;
      setMessages(msgs || []);
    } catch (error: any) {
      console.error('Error fetching:', error);
      setLoadError(error.message || 'Could not load the document chat.');
    }
  };

  const searchSimilarChunks = async (query: string, limit = 3): Promise<Chunk[]> => {
    const queryEmbedding = await embedText(query);

    const { data, error } = await supabase.rpc('match_chunks', {
      query_embedding: queryEmbedding,
      match_count: limit,
      match_document_id: documentId,
    });

    if (error) throw error;
    return data || [];
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !apiKey || !user || !documentId) return;

    const userMessage = input.trim();
    setInput('');
    setIsSending(true);

    try {
      const { data: savedMsg, error: userMsgError } = await supabase
        .from('messages')
        .insert({
          user_id: user.id,
          document_id: documentId,
          role: 'user',
          content: userMessage,
          citations: [],
        })
        .select()
        .single();

      if (userMsgError) throw userMsgError;
      setMessages((prev) => [...prev, savedMsg]);

      const relevantChunks = await searchSimilarChunks(userMessage);
      const context = relevantChunks.map((c) => c.content).join('\n\n');

      const response = await callGroqAPI(
        [
          {
            role: 'system',
            content: `You are a helpful study assistant. Answer questions based on the provided document context. Be concise and cite which page the information comes from.\n\nDocument context:\n${context}`,
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
        apiKey
      );

      const citations = relevantChunks.map((c) => ({
        page: c.page_number,
        snippet: `${c.content.substring(0, 160)}${c.content.length > 160 ? '...' : ''}`,
        chunk_id: c.id,
      }));

      const { data: assistantMsg, error: assistantMsgError } = await supabase
        .from('messages')
        .insert({
          user_id: user.id,
          document_id: documentId,
          role: 'assistant',
          content: response,
          citations,
        })
        .select()
        .single();

      if (assistantMsgError) throw assistantMsgError;
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const statusLabel = (status: typeof documentStatus) => {
    switch (status) {
      case 'ready':
        return { text: 'Ready', dot: 'bg-emerald-400', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' };
      case 'error':
        return { text: 'Failed', dot: 'bg-rose-400', className: 'border-rose-500/30 bg-rose-500/10 text-rose-300' };
      case 'processing':
        return { text: 'Processing', dot: 'bg-amber-400 animate-pulse', className: 'border-amber-500/30 bg-amber-500/10 text-amber-300' };
      default:
        return { text: '', dot: '', className: '' };
    }
  };

  if (loading || !documentId) {
    return (
      <div className="night-shell flex min-h-screen items-center justify-center text-slate-100">
        <div className="flex items-center gap-3 text-slate-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          Loading…
        </div>
      </div>
    );
  }

  const status = statusLabel(documentStatus);

  return (
    <div className="night-shell flex min-h-screen flex-col text-slate-100">
      <nav className="sticky top-0 z-20 border-b border-line bg-ink-900/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-5 py-4 sm:gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="np-icon-btn shrink-0 border-line bg-ink-800 text-slate-300 hover:bg-ink-700"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={20} />
          </button>
          <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-ink-800 text-accent sm:flex">
            <FileText size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold leading-tight text-white" title={documentTitle}>
              {documentTitle || 'Document chat'}
            </h1>
            <div className="mt-1.5 flex items-center gap-2">
              {status.text && (
                <span className={`np-badge ${status.className}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                  {status.text}
                </span>
              )}
              {loadError && <span className="text-xs text-rose-300">Could not load this document.</span>}
            </div>
          </div>
        </div>
      </nav>

      {showKeyInput && !apiKey && (
        <div className="border-b border-line bg-ink-850">
          <div className="mx-auto max-w-4xl px-5 py-4">
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
              <KeyRound size={15} className="text-accent" />
              Enter your Groq API key
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="password"
                placeholder="gsk_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="np-input flex-1"
              />
              <button onClick={() => setShowKeyInput(false)} disabled={!apiKey} className="np-btn-accent">
                <Check size={16} />
                Save key
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">Stored only in this browser tab for the session — never uploaded.</p>
          </div>
        </div>
      )}

      {loadError ? (
        <div className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center p-6">
          <div className="np-card w-full border-rose-500/30 bg-rose-500/[0.06] p-6 text-rose-100">
            <p className="font-semibold">This document could not be opened.</p>
            <p className="mt-2 text-sm text-rose-100/80">{loadError}</p>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="np-btn-ghost mt-4 border-rose-400/40 hover:bg-rose-500/10"
            >
              <ArrowLeft size={15} />
              Back to dashboard
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-5 py-6">
            <div className="mx-auto w-full max-w-4xl space-y-5">
              {messages.length === 0 ? (
                <div className="np-card dot-grid mt-8 flex flex-col items-center px-6 py-16 text-center">
                  <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-ink-800 text-accent">
                    <Sparkles size={28} />
                  </span>
                  <p className="text-lg font-bold text-white">Ask anything about this document</p>
                  <p className="mt-2 max-w-sm text-sm text-slate-400">
                    {documentStatus === 'processing'
                      ? 'This document is still processing in the database.'
                      : documentStatus === 'error'
                        ? 'This document failed earlier. Reset or re-upload it from the dashboard.'
                        : 'Every reply includes page citations and source previews you can expand.'}
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex animate-fade-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-2xl rounded-2xl px-4 py-3 ${
                        msg.role === 'user'
                          ? 'rounded-br-sm bg-accent font-medium text-ink-950'
                          : 'rounded-bl-sm border border-line bg-ink-800 text-slate-100 shadow-card'
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>

                      {msg.citations && msg.citations.length > 0 && (
                        <div className={`mt-3 border-t pt-3 text-xs ${msg.role === 'user' ? 'border-ink-950/20' : 'border-line'}`}>
                          <button
                            type="button"
                            onClick={() => setExpandedSources(expandedSources === msg.id ? null : msg.id)}
                            className={`mb-2 flex items-center gap-1.5 font-semibold ${msg.role === 'user' ? 'text-ink-950/80' : 'text-slate-300'}`}
                          >
                            <FileText size={12} />
                            {expandedSources === msg.id ? 'Hide sources' : `Sources (${msg.citations.length})`}
                          </button>

                          {(expandedSources === msg.id ? msg.citations : msg.citations.slice(0, 2)).map((c, i) => (
                            <div
                              key={i}
                              className={`mb-2 rounded-lg border p-2.5 ${
                                msg.role === 'user' ? 'border-ink-950/15 bg-ink-950/5' : 'border-line bg-ink-850'
                              }`}
                            >
                              <p className={`font-semibold ${msg.role === 'user' ? 'text-ink-950' : 'text-accent'}`}>Page {c.page}</p>
                              <p className={`mt-1 leading-relaxed ${msg.role === 'user' ? 'text-ink-950/70' : 'text-slate-400'}`}>{c.snippet}</p>
                            </div>
                          ))}

                          {msg.citations.length > 2 && expandedSources !== msg.id && (
                            <p className={msg.role === 'user' ? 'text-ink-950/60' : 'text-slate-500'}>
                              +{msg.citations.length - 2} more excerpt{msg.citations.length - 2 > 1 ? 's' : ''} — tap Sources.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {sending && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-line bg-ink-800 px-4 py-3 text-sm text-slate-400 shadow-card">
                    <Loader2 size={15} className="animate-spin text-accent" />
                    Thinking…
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="sticky bottom-0 border-t border-line bg-ink-900/85 px-5 py-4 backdrop-blur-md">
            <form onSubmit={handleSendMessage} className="mx-auto flex max-w-4xl items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={apiKey ? 'Ask a question about this document…' : 'Add your Groq API key above to start…'}
                disabled={sending || !apiKey}
                className="np-input flex-1 disabled:opacity-50"
              />
              <button type="submit" disabled={sending || !apiKey || !input.trim()} className="np-btn-accent shrink-0">
                <Send size={18} />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
