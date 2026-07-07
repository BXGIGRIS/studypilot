import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { ArrowRight, FileText, MessagesSquare, Quote } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      router.replace('/chat');
    }
  }, [user, router]);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      setMessage('Check your email for the login link.');
      setEmail('');
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const sent = message.startsWith('Check');

  return (
    <div className="night-shell min-h-screen text-slate-100">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-12 px-6 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
        {/* Left - pitch */}
        <section className="animate-fade-up">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-line bg-ink-800 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span className="text-xs font-semibold tracking-wide text-slate-300">PDF study workspace</span>
          </div>

          <h1 className="text-6xl font-black leading-[0.92] tracking-tight text-white sm:text-7xl">
            Study
            <span className="text-accent">Pilot</span>
          </h1>

          <p className="mt-6 max-w-md text-lg leading-8 text-slate-400">
            Drop in a textbook, paper, or lecture PDF and turn it into a focused Q&amp;A session -
            every answer backed by the exact page it came from.
          </p>

          <div className="mt-10 grid max-w-lg gap-3 sm:grid-cols-3">
            {[
              { icon: FileText, label: 'Upload a PDF', step: '01' },
              { icon: MessagesSquare, label: 'Ask real questions', step: '02' },
              { icon: Quote, label: 'Check every source', step: '03' },
            ].map(({ icon: Icon, label, step }) => (
              <div key={step} className="np-card p-4">
                <div className="flex items-center justify-between">
                  <Icon size={18} className="text-accent" />
                  <span className="font-mono text-xs text-slate-600">{step}</span>
                </div>
                <p className="mt-3 text-sm font-medium text-slate-300">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Right - auth card */}
        <section className="animate-fade-up">
          <div className="np-card p-7 sm:p-8">
            <h2 className="text-2xl font-bold tracking-tight text-white">Sign in</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Enter your email - we&apos;ll send a one-tap magic link. No password to remember.
            </p>

            <form onSubmit={handleMagicLink} className="mt-6 space-y-4">
              <div>
                <label htmlFor="login-email" className="mb-2 block text-sm font-semibold text-slate-300">
                  Email address
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@university.edu"
                  className="np-input"
                  required
                />
              </div>

              <button type="submit" disabled={loading} className="np-btn-accent w-full py-3.5 text-base">
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-950/40 border-t-ink-950" />
                    Sending...
                  </>
                ) : (
                  <>
                    Send magic link
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {message && (
              <p
                role="status"
                className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                  sent
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                }`}
              >
                {message}
              </p>
            )}

            <p className="mt-7 border-t border-line pt-5 text-xs leading-6 text-slate-500">
              Free to start. Bring your own Groq API key when you&apos;re ready to chat.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
