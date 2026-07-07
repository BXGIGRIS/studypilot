import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import type { Document } from '@/lib/supabase';
import FileUpload from '@/components/FileUpload';
import { ArrowRight, LogOut, RotateCcw, Trash2, FileText, FileStack } from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busyDocumentId, setBusyDocumentId] = useState<string | null>(null);

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

  const fetchDocuments = async () => {
    setLoadError('');
    setLoadingDocs(true);

    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      setLoadError(error.message || 'Could not load documents.');
    } finally {
      setLoadingDocs(false);
    }
  };

  const openChat = (docId: string) => {
    router.push(`/chat?doc=${docId}`);
  };

  const cleanupDocument = async (doc: Document) => {
    const { error: chunkError } = await supabase
      .from('chunks')
      .delete()
      .eq('document_id', doc.id);
    if (chunkError) throw chunkError;

    const { error: messageError } = await supabase
      .from('messages')
      .delete()
      .eq('document_id', doc.id);
    if (messageError) throw messageError;

    await supabase.storage.from('documents').remove([doc.storage_path]);

    const { error: docError } = await supabase
      .from('documents')
      .delete()
      .eq('id', doc.id);
    if (docError) throw docError;
  };

  const handleDelete = async (doc: Document) => {
    if (!window.confirm(`Delete "${doc.filename}"? This removes the document, chunks, and chat messages.`)) {
      return;
    }

    setBusyDocumentId(doc.id);
    try {
      await cleanupDocument(doc);
      setDocuments((current) => current.filter((item) => item.id !== doc.id));
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Could not remove the document. Check your Supabase policies and try again.');
    } finally {
      setBusyDocumentId(null);
    }
  };

  const handleRetry = async (doc: Document) => {
    if (!window.confirm(`Retry "${doc.filename}"? This clears the failed record so you can upload it again.`)) {
      return;
    }

    setBusyDocumentId(doc.id);
    try {
      await cleanupDocument(doc);
      setDocuments((current) => current.filter((item) => item.id !== doc.id));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error resetting failed document:', error);
      alert('Could not reset the failed upload. Check your Supabase policies and try again.');
    } finally {
      setBusyDocumentId(null);
    }
  };

  const statusBadge = (status: Document['status']) => {
    switch (status) {
      case 'ready':
        return { text: 'Ready', dot: 'bg-emerald-400', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' };
      case 'error':
        return { text: 'Failed', dot: 'bg-rose-400', className: 'border-rose-500/30 bg-rose-500/10 text-rose-300' };
      default:
        return { text: 'Processing', dot: 'bg-amber-400 animate-pulse', className: 'border-amber-500/30 bg-amber-500/10 text-amber-300' };
    }
  };

  if (loading) {
    return (
      <div className="night-shell flex min-h-screen items-center justify-center text-slate-100">
        <div className="flex items-center gap-3 text-slate-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          Loading your workspace...
        </div>
      </div>
    );
  }

  if (!user) return null;

  const readyCount = documents.filter((d) => d.status === 'ready').length;

  return (
    <div className="night-shell min-h-screen text-slate-100">
      <nav className="sticky top-0 z-20 border-b border-line bg-ink-900/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-ink-950">
              <FileStack size={18} strokeWidth={2.5} />
            </span>
            <span className="text-lg font-black tracking-tight text-white">
              Study<span className="text-accent">Pilot</span>
            </span>
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

      <main className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-8">
          <p className="eyebrow text-accent-dim">Workspace</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">Your study desk</h1>
          <p className="mt-2 max-w-xl text-slate-400">Upload a PDF, then open a chat to ask questions with page-backed answers.</p>
        </header>

        <FileUpload onUploadComplete={fetchDocuments} />

        <div className="mt-14">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold tracking-tight text-white">Documents</h2>
              {!loadingDocs && !loadError && documents.length > 0 && (
                <span className="np-badge border-line bg-ink-800 text-slate-400">
                  {readyCount} ready / {documents.length} total
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">Ready documents open chat. Failed ones can be reset or deleted.</p>
          </div>

          {loadingDocs ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="np-card h-44 animate-pulse p-5">
                  <div className="mb-4 h-10 w-10 rounded-xl bg-white/5" />
                  <div className="mb-3 h-4 w-2/3 rounded bg-white/5" />
                  <div className="h-3 w-1/3 rounded bg-white/5" />
                </div>
              ))}
            </div>
          ) : loadError ? (
            <div className="np-card border-rose-500/30 bg-rose-500/[0.06] p-6 text-sm text-rose-200">
              <p className="font-semibold">Could not load documents.</p>
              <p className="mt-1 text-rose-200/80">{loadError}</p>
              <button type="button" onClick={fetchDocuments} className="np-btn-ghost mt-4 border-rose-400/40 hover:bg-rose-500/10">
                <RotateCcw size={15} />
                Try again
              </button>
            </div>
          ) : documents.length === 0 ? (
            <div className="np-card dot-grid flex flex-col items-center justify-center px-6 py-16 text-center">
              <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-ink-800 text-accent">
                <FileText size={28} />
              </span>
              <p className="text-lg font-bold text-white">No documents yet</p>
              <p className="mt-2 max-w-sm text-sm text-slate-400">
                Upload a PDF above and it&apos;ll show up here, ready to chat with page citations.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc) => {
                const badge = statusBadge(doc.status);
                const canChat = doc.status === 'ready';

                return (
                  <div
                    key={doc.id}
                    role={canChat ? 'button' : undefined}
                    tabIndex={canChat ? 0 : undefined}
                    onKeyDown={(e) => {
                      if (canChat && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        openChat(doc.id);
                      }
                    }}
                    className={`np-card group flex flex-col p-5 transition duration-200 ${
                      canChat ? 'cursor-pointer hover:-translate-y-1 hover:border-accent/40 hover:shadow-lift' : 'opacity-90'
                    }`}
                    onClick={() => canChat && openChat(doc.id)}
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-ink-800 text-accent transition group-hover:border-accent/40">
                        <FileText size={20} />
                      </span>
                      <span className={`np-badge ${badge.className}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                        {badge.text}
                      </span>
                    </div>

                    <h3 className="break-words text-base font-bold leading-snug text-white" title={doc.filename}>
                      {doc.filename}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">{doc.page_count} pages</p>

                    <div className="mt-5 flex gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openChat(doc.id);
                        }}
                        disabled={!canChat || busyDocumentId === doc.id}
                        className="np-btn-accent flex-1"
                      >
                        Open chat
                        <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
                      </button>

                      {doc.status === 'error' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRetry(doc);
                          }}
                          disabled={busyDocumentId === doc.id}
                          className="np-icon-btn border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                          title="Clear this failed upload so you can upload it again"
                          aria-label="Reset failed upload"
                        >
                          <RotateCcw size={16} />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(doc);
                        }}
                        disabled={busyDocumentId === doc.id}
                        className="np-icon-btn border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                        title="Delete this document"
                        aria-label="Delete document"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
