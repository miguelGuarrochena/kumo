'use client';

import { CloudLogo } from '@/components/CloudLogo';
import { CloudDecorations } from '@/components/CloudDecorations';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Mail, ArrowLeft, Check, Loader2 } from 'lucide-react';

// Mensajes amigables por código de error que viene del callback
const ERROR_LABELS: Record<string, string> = {
  auth_failed:   'No pudimos completar el login. Probá de nuevo.',
  no_user:       'La sesión no se creó correctamente. Probá de nuevo.',
  missing_code:  'Falta el código de autenticación.',
};

type Mode = 'choose' | 'email' | 'email-sent';

const LoginInner = () => {
  const sp = useSearchParams();
  const errorCode = sp.get('error');
  const errorDetail = sp.get('detail');
  const next = sp.get('next');

  const [mode, setMode] = useState<Mode>('choose');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    errorCode ? (ERROR_LABELS[errorCode] ?? errorCode) : null,
  );

  const buildCallbackUrl = () => {
    const url = new URL(`${window.location.origin}/auth/callback`);
    if (next) url.searchParams.set('next', next);
    return url.toString();
  };

  const onGoogle = async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: buildCallbackUrl() },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const onEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: buildCallbackUrl(),
        shouldCreateUser: true,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setMode('email-sent');
    setLoading(false);
  };

  return (
    <main className="min-h-screen grid place-items-center px-4">
      <CloudDecorations />

      <div className="kumo-card relative w-full max-w-md p-8 space-y-6">
        <div className="flex flex-col items-center gap-2">
          <CloudLogo className="w-40 cloud-float" withWordmark />
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 text-center">
            Tus gastos, organizados como una nube perfecta
          </p>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
          {mode === 'choose' && (
            <ChooseMode
              loading={loading}
              onGoogle={onGoogle}
              onEmailMode={() => { setMode('email'); setError(null); }}
            />
          )}

          {mode === 'email' && (
            <EmailMode
              email={email}
              setEmail={setEmail}
              loading={loading}
              onSubmit={onEmail}
              onBack={() => { setMode('choose'); setError(null); }}
            />
          )}

          {mode === 'email-sent' && (
            <EmailSent email={email} onBack={() => { setMode('choose'); setEmail(''); }} />
          )}

          {error && mode !== 'email-sent' && (
            <div className="mt-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/40">
              <p className="text-sm text-rose-700 dark:text-rose-300 text-center">{error}</p>
              {errorDetail && (
                <p className="text-[11px] text-rose-500 dark:text-rose-400 text-center mt-1 font-mono break-all">
                  {decodeURIComponent(errorDetail)}
                </p>
              )}
            </div>
          )}

          <p className="mt-6 text-xs text-slate-400 dark:text-slate-500 text-center">
            Tus datos son privados. Sólo vos los ves.
          </p>
        </div>
      </div>
    </main>
  );
};

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------

const ChooseMode = ({
  loading,
  onGoogle,
  onEmailMode,
}: {
  loading: boolean;
  onGoogle: () => void;
  onEmailMode: () => void;
}) => (
  <div className="space-y-2.5">
    <button
      onClick={onGoogle}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-500 hover:bg-sky-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-slate-700 dark:text-slate-200"
    >
      <GoogleIcon />
      {loading ? 'Conectando...' : 'Continuar con Google'}
    </button>

    <div className="relative flex items-center gap-3 py-1">
      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
      <span className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium">
        o
      </span>
      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
    </div>

    <button
      onClick={onEmailMode}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-500 hover:bg-sky-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50 font-medium text-slate-700 dark:text-slate-200"
    >
      <Mail className="w-4 h-4" />
      Continuar con email
    </button>
  </div>
);

const EmailMode = ({
  email,
  setEmail,
  loading,
  onSubmit,
  onBack,
}: {
  email: string;
  setEmail: (s: string) => void;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}) => (
  <form onSubmit={onSubmit} className="space-y-3">
    <button
      type="button"
      onClick={onBack}
      className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      Otra forma de entrar
    </button>

    <div>
      <label className="block text-sm font-medium mb-1.5">Tu email</label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="vos@email.com"
        required
        autoFocus
        className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
      />
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
        Te mandamos un link mágico para entrar. Sin contraseña.
      </p>
    </div>

    <button
      type="submit"
      disabled={loading || !email.trim()}
      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl kumo-gradient text-white font-medium hover:opacity-90 disabled:opacity-50 active:scale-[0.98] transition-all"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Enviando…
        </>
      ) : (
        <>Enviar link</>
      )}
    </button>
  </form>
);

const EmailSent = ({ email, onBack }: { email: string; onBack: () => void }) => (
  <div className="space-y-4 text-center">
    <div className="w-14 h-14 rounded-full bg-mint-100 dark:bg-mint-500/20 grid place-items-center mx-auto">
      <Check className="w-7 h-7 text-mint-500" strokeWidth={3} />
    </div>
    <div className="space-y-1">
      <h2 className="font-semibold text-lg">Revisá tu email</h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Mandamos un link a <strong className="text-slate-900 dark:text-white break-all">{email}</strong>.
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
        Hacé click en el link para entrar. Si no lo encontrás, revisá spam.
      </p>
    </div>
    <button
      type="button"
      onClick={onBack}
      className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 inline-flex items-center gap-1.5"
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      Usar otra forma
    </button>
  </div>
);

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
    <path
      fill="#FFC107"
      d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
    />
    <path
      fill="#FF3D00"
      d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
    />
  </svg>
);

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
