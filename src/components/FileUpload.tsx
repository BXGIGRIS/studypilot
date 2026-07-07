import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { extractTextFromPDF, chunkText } from '@/lib/pdf';
import { embedMultiple } from '@/lib/embeddings';
import { UploadCloud, FileText, Loader2, AlertTriangle } from 'lucide-react';

interface FileUploadProps {
  onUploadComplete: (documentId?: string) => void;
}

export default function FileUpload({ onUploadComplete }: FileUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.type !== 'application/pdf') {
      setMessage('Please choose a PDF file.');
      return;
    }

    const maxFileSize = 25 * 1024 * 1024;
    if (file.size > maxFileSize) {
      setMessage('This PDF is too large for the browser prototype. Try a file under 25MB.');
      return;
    }

    setUploading(true);
    setProgress(0);
    setMessage('');

    let storagePath: string | null = null;
    let documentId: string | null = null;

    try {
      setProgress(10);
      setMessage('Reading PDF...');
      const { text, pageCount } = await extractTextFromPDF(file);

      if (pageCount > 100) {
        throw new Error('This PDF has more than 100 pages. Try a smaller file first.');
      }

      setProgress(25);
      setMessage('Uploading file...');
      const filename = `${user.id}/${Date.now()}-${file.name}`;
      storagePath = filename;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filename, file);

      if (uploadError) throw uploadError;

      setProgress(40);
      setMessage('Creating document record...');
      const { data: docData, error: docError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          filename: file.name,
          storage_path: filename,
          page_count: pageCount,
          status: 'processing',
        })
        .select()
        .single();

      if (docError) throw docError;
      documentId = docData.id;

      setProgress(55);
      setMessage('Chunking text...');
      const { chunks, pageMap } = chunkText(text);

      if (chunks.length === 0) {
        throw new Error('No readable text was found. Scanned PDFs need OCR, which is not built yet.');
      }

      setProgress(70);
      setMessage(`Generating embeddings (${chunks.length} chunks)...`);
      const embeddings = await embedMultiple(chunks);

      setProgress(85);
      setMessage('Storing in database...');
      const chunkRecords = chunks.map((chunk, i) => ({
        user_id: user.id,
        document_id: docData.id,
        page_number: pageMap[i],
        content: chunk,
        embedding: embeddings[i],
        chunk_index: i,
      }));

      const { error: chunkError } = await supabase
        .from('chunks')
        .insert(chunkRecords);

      if (chunkError) throw chunkError;

      const { error: readyError } = await supabase
        .from('documents')
        .update({ status: 'ready' })
        .eq('id', docData.id);

      if (readyError) throw readyError;

      setProgress(100);
      setMessage('Upload complete!');
      setTimeout(() => {
        setUploading(false);
        setMessage('');
        setProgress(0);
        onUploadComplete(documentId || undefined);
      }, 2000);
    } catch (error: any) {
      if (documentId) {
        await supabase
          .from('documents')
          .update({ status: 'error' })
          .eq('id', documentId);
      } else if (storagePath) {
        await supabase.storage
          .from('documents')
          .remove([storagePath]);
      }

      setMessage(`Error: ${error.message}`);
      setUploading(false);
    } finally {
      e.target.value = '';
    }
  };

  const isError =
    message.startsWith('Error') ||
    message.startsWith('Please') ||
    message.startsWith('This PDF') ||
    message.startsWith('No readable');

  return (
    <div className="np-card overflow-hidden">
      <label
        className={`dot-grid group flex cursor-pointer flex-col items-center gap-4 px-6 py-12 text-center transition ${
          uploading ? 'cursor-default bg-accent/[0.03]' : 'hover:bg-accent/[0.04]'
        }`}
      >
        <span
          className={`flex h-16 w-16 items-center justify-center rounded-2xl border transition ${
            uploading
              ? 'border-accent/40 bg-accent/10 text-accent'
              : 'border-line bg-ink-800 text-accent group-hover:scale-105 group-hover:border-accent/40'
          }`}
        >
          {uploading ? <Loader2 size={28} className="animate-spin" /> : <UploadCloud size={28} />}
        </span>

        <span>
          <span className="block text-xl font-bold text-white">
            {uploading ? 'Processing your PDF...' : 'Drop a PDF to get started'}
          </span>
          <span className="mt-1.5 block text-sm text-slate-400">
            {uploading ? 'Hang tight - this can take a moment.' : 'Click to browse / up to 25 MB / 100 pages'}
          </span>
        </span>

        <input
          type="file"
          accept=".pdf"
          onChange={handleFileUpload}
          disabled={uploading}
          className="hidden"
        />
      </label>

      {uploading && (
        <div className="border-t border-line px-6 py-4">
          <div className="mb-2 flex items-center justify-between text-xs font-medium">
            <span className="flex items-center gap-1.5 text-slate-300">
              <FileText size={13} className="text-accent" />
              {message || 'Working...'}
            </span>
            <span className="font-mono tabular-nums text-accent">{progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-700">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {!uploading && message && (
        <div
          className={`flex items-center gap-2 border-t px-6 py-3.5 text-sm ${
            isError
              ? 'border-rose-500/20 bg-rose-500/5 text-rose-300'
              : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300'
          }`}
        >
          <AlertTriangle size={16} className="shrink-0" />
          {message}
        </div>
      )}
    </div>
  );
}
