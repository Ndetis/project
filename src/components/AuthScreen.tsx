import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { ArrowRight, RefreshCw, Sun, Moon, Clock, Wrench, Gift, Sparkles, Shield } from 'lucide-react';
import type { UserRole } from '@/lib/types';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    if (mode === 'signup') {
      const role: UserRole = isAdmin ? 'admin' : 'member';
      const { error: err } = await signUp(email, password, fullName, role);
      if (err) setError(err);
    } else {
      const { error: err } = await signIn(email, password);
      if (err) setError(err);
    }
    setLoading(false);
  };

  const fillDemo = (account: 'member' | 'admin') => {
    setMode('signin');
    if (account === 'admin') {
      setEmail('admin@mpe.community');
    } else {
      setEmail('sarah@mpe.community');
    }
    setPassword('password123');
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col lg:flex-row">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 bg-surface-2 flex-col justify-between p-12 xl:p-16 relative overflow-hidden">
        {/* Decorative grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgb(var(--text-primary)) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--text-primary)) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-accent flex items-center justify-center">
              <span className="text-xl font-black text-accent-text tracking-tighter">B</span>
            </div>
            <div>
              <p className="font-black tracking-tight text-text-primary text-lg">BARTER</p>
              <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Time · Talent · Treasure</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-3xl xl:text-4xl font-black text-text-primary tracking-tight leading-tight">
            Turn the hidden capacity<br />of your community<br />into mutual impact.
          </h1>
          <p className="text-text-secondary text-base leading-relaxed max-w-md">
            You have something. Someone needs something. Barter's AI agent discovers
            meaningful exchanges — even multi-person connections you'd never find alone.
          </p>

          <div className="grid grid-cols-3 gap-3 pt-4">
            <FeatureCard icon={Clock} label="Time" />
            <FeatureCard icon={Wrench} label="Talent" />
            <FeatureCard icon={Gift} label="Treasure" />
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-text-muted text-xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI-powered community exchange platform</span>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col">
        {/* Top bar with theme toggle */}
        <div className="flex items-center justify-between p-4 lg:p-6">
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
              <span className="text-lg font-black text-accent-text tracking-tighter">B</span>
            </div>
            <span className="font-black tracking-tight text-text-primary">BARTER</span>
          </div>
          <div className="ml-auto">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-border text-text-secondary hover:text-text-primary hover:border-border-2 transition-all"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
          <div className="w-full max-w-sm">
            <h2 className="text-2xl font-bold text-text-primary tracking-tight mb-1">
              {mode === 'signup' ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-text-tertiary text-sm mb-8">
              {mode === 'signup' ? 'Join your community and start exchanging.' : 'Sign in to continue to Barter.'}
            </p>

            {/* Tab switcher */}
            <div className="flex gap-1 p-1 bg-surface-2 rounded-xl border border-border mb-6">
              <button
                onClick={() => setMode('signin')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  mode === 'signin' ? 'bg-accent text-accent-text' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setMode('signup')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  mode === 'signup' ? 'bg-accent text-accent-text' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <FormField label="Full Name" value={fullName} onChange={setFullName} placeholder="John Doe" type="text" />
              )}
              <FormField label="Email" value={email} onChange={setEmail} placeholder="you@example.com" type="email" />
              <FormField label="Password" value={password} onChange={setPassword} placeholder="••••••••" type="password" minLength={6} />

              {mode === 'signup' && (
                <button
                  type="button"
                  onClick={() => setIsAdmin(!isAdmin)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                    isAdmin ? 'border-accent bg-surface-3' : 'border-border bg-surface-2 hover:border-border-2'
                  }`}
                >
                  <Shield className={`w-5 h-5 flex-shrink-0 ${isAdmin ? 'text-text-primary' : 'text-text-tertiary'}`} />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isAdmin ? 'text-text-primary' : 'text-text-secondary'}`}>
                      Register as Community Coordinator
                    </p>
                    <p className="text-text-muted text-xs">Admins can create and manage communities</p>
                  </div>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                    isAdmin ? 'bg-accent border-accent' : 'border-border-2'
                  }`}>
                    {isAdmin && <div className="w-2 h-2 rounded-sm bg-accent-text" />}
                  </div>
                </button>
              )}

              {error && (
                <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-4 py-2.5">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-accent text-accent-text rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {mode === 'signup' ? 'Create Account' : 'Sign In'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Demo accounts */}
            <div className="mt-6 pt-6 border-t border-border space-y-2">
              <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium">Quick demo access</p>
              <div className="flex gap-2">
                <button
                  onClick={() => fillDemo('member')}
                  className="flex-1 py-2.5 rounded-lg bg-surface-2 border border-border text-text-secondary text-xs font-medium hover:text-text-primary hover:border-border-2 transition-all"
                >
                  Member demo
                </button>
                <button
                  onClick={() => fillDemo('admin')}
                  className="flex-1 py-2.5 rounded-lg bg-surface-2 border border-border text-text-secondary text-xs font-medium hover:text-text-primary hover:border-border-2 transition-all"
                >
                  Admin demo
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 text-center">
          <p className="text-text-muted text-xs">
            You have something. Someone needs something. Let's connect.
          </p>
        </div>
      </div>
    </div>
  );
}

function FormField({
  label, value, onChange, placeholder, type, minLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type: string;
  minLength?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-tertiary mb-1.5 uppercase tracking-wide">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        minLength={minLength}
        className="w-full px-4 py-3 bg-surface-2 border border-border rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-border-2 transition-colors"
        placeholder={placeholder}
      />
    </div>
  );
}

function FeatureCard({ icon: Icon, label }: { icon: typeof Clock; label: string }) {
  return (
    <div className="bg-surface-3 rounded-xl p-4 border border-border">
      <Icon className="w-5 h-5 text-text-secondary mb-2" />
      <p className="text-text-secondary text-xs font-medium">{label}</p>
    </div>
  );
}
