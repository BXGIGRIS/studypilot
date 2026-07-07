import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { embedText } from '@/lib/embeddings';
import { callGroqAPI } from '@/lib/groq';
import type { Message as MessageType, Chunk, Document } from '@/lib/supabase';
import FileUpload from '@/components/FileUpload';
import { Send, KeyRound, Check, Sparkles, FileText, Loader2, LogOut, Library } from 'lucide-react';

export default function Chat() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const { doc: docId } = router.query;
  const documentId = Array.isArray(docId) ? docId[0] : docId;
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
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
    if (user) {
      fetchDocuments();
    }
  }, [user]);

  useEffect(() => {
    if (documentId && user) {
      fetchDocumentAndMessages();
    } else {
      setMessages([]);
      setDocumentTitle('');
      setDocumentStatus('');
      setLoadError('');
    }
  }, [documentId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchDocuments = async () => {
    setLoadingDocs(true);

    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleUploadComplete = async (newDocumentId?: string) => {
    await fetchDocuments();

    if (newDocumentId) {
      router.push(`/chat?doc=${newDocumentId}`);
    }
  };

  const openDocument = (nextDocumentId: string) => {
    router.push(`/chat?doc=${nextDocumentId}`);
  };

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
    if (!input.trim() || !apiKey || !user || !documentId || documentStatus !== 'ready') return;

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

  const statusLabel = (status: Document['status'] | '') => {
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

  if (loading) {
    return (
      <div className="night-shell flex min-h-screen items-center justify-center text-slate-100">
        <div className="flex items-center gap-3 text-slate-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          Loading...
        </div>
      </div>
    );
  }

  if (!user) return null;

  const currentStatus = statusLabel(documentStatus);
  const chatDisabled = !apiKey || sending || !documentId || documentStatus !== 'ready';

  return (
    <div className="night-shell flex min-h-screen flex-col text-slate-100">
      <nav className="sticky top-0 z-20 border-b border-line bg-ink-900/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-ink-950">
              <Library size={18} strokeWidth={2.5} />
            </span>
            <div>
              <p className="text-lg font-black tracking-tight text-white">
                Study<span className="text-accent">Pilot</span>
              </p>
              <p className="text-xs text-slate-500">Upload a PDF, then chat in the same workspace.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">{user.email}</span>
            <button onClick={signOut} className="np-btn-ghost">
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-5 px-5 py-5 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <FileUpload onUploadComplete={handleUploadComplete} />

          <section className="np-card overflow-hidden">
            <div className="border-b border-line px-4 py-3">
              <h2 className="font-bold text-white">Documents</h2>
              <p className="mt-1 text-xs text-slate-500">Ready files can be opened for chat.</p>
            </div>

            <div className="max-h-[420px] overflow-y-auto p-2">
              {loadingDocs ? (
                <div className="p-4 text-sm text-slate-500">Loading documents...</div>
              ) : documents.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">No PDFs yet. Upload one above to start.</div>
              ) : (
                documents.map((doc) => {
                  const badge = statusLabel(doc.status);
                  const selected = doc.id === documentId;
                  const canOpen = doc.status === 'ready';

                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => canOpen && openDocument(doc.id)}
                      disabled={!canOpen}
                      className={`mb-2 w-full rounded-xl border p-3 text-left transition ${
                        selected
                          ? 'border-accent/50 bg-accent/10'
                          : 'border-line bg-ink-800 hover:border-slate-600'
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      <div className="flex items-start gap-3">
                        <FileText size={18} className="mt-0.5 shrink-0 text-accent" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white" title={doc.filename}>
                            {doc.filename}
                          </p>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="text-xs text-slate-500">{doc.page_count} pages</span>
                            <span className={`np-badge ${badge.className}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                              {badge.text}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        </aside>

        <section className="np-card flex min-h-[70vh] flex-col overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-ink-800 text-accent sm:flex">
                <FileText size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-lg font-bold leading-tight text-white" title={documentTitle}>
                  {documentTitle || 'Start with a PDF'}
                </h1>
                <div className="mt-1.5 flex items-center gap-2">
                  {currentStatus.text ? (
                    <span className={`np-badge ${currentStatus.className}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${currentStatus.dot}`} />
                      {currentStatus.text}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">Upload or select a document to begin.</span>
                  )}
                  {loadError && <span className="text-xs text-rose-300">Could not load this document.</span>}
                </div>
              </div>
            </div>
          </div>

          {showKeyInput && !apiKey && (
            <div className="border-b border-line bg-ink-850 px-5 py-4">
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
              <p className="mt-2 text-xs text-slate-500">Stored only in this browser tab for the session - never uploaded.</p>
            </div>
          )}

          {loadError ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <div className="w-full max-w-xl rounded-2xl border border-rose-500/30 bg-rose-500/[0.06] p-6 text-rose-100">
                <p className="font-semibold">This document could not be opened.</p>
                <p className="mt-2 text-sm text-rose-100/80">{loadError}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-5 py-6">
                <div className="mx-auto w-full max-w-3xl space-y-5">
                  {!documentId ? (
                    <div className="dot-grid flex flex-col items-center px-6 py-20 text-center">
                      <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-ink-800 text-accent">
                        <Sparkles size={28} />
                      </span>
                      <p className="text-lg font-bold text-white">Upload a PDF to start chatting</p>
                      <p className="mt-2 max-w-sm text-sm text-slate-400">
                        Use the upload panel on the left. When processing finishes, the chat will open automatically.
                      </p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="dot-grid flex flex-col items-center px-6 py-20 text-center">
                      <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-ink-800 text-accent">
                        <Sparkles size={28} />
                      </span>
                      <p className="text-lg font-bold text-white">Ask anything about this document</p>
                      <p className="mt-2 max-w-sm text-sm text-slate-400">
                        {documentStatus === 'processing'
                          ? 'This document is still processing. You can chat once it is ready.'
                          : documentStatus === 'error'
                            ? 'This document failed earlier. Upload it again or try another PDF.'
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
                                  +{msg.citations.length - 2} more excerpt{msg.citations.length - 2 > 1 ? 's' : ''} - tap Sources.
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
                        Thinking...
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <div className="border-t border-line bg-ink-900/85 px-5 py-4 backdrop-blur-md">
                <form onSubmit={handleSendMessage} className="mx-auto flex max-w-3xl items-center gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      !documentId
                        ? 'Upload or select a PDF first...'
                        : !apiKey
                          ? 'Add your Groq API key above to start...'
                          : documentStatus !== 'ready'
                            ? 'Document is not ready yet...'
                            : 'Ask a question about this document...'
                    }
                    disabled={chatDisabled}
                    className="np-input flex-1 disabled:opacity-50"
                  />
                  <button type="submit" disabled={chatDisabled || !input.trim()} className="np-btn-accent shrink-0">
                    <Send size={18} />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </form>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
