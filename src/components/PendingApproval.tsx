import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { Clock, Moon, Sun } from 'lucide-react';

export default function PendingApproval() {
  const { profile, refreshProfile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [communityName, setCommunityName] = useState('this community');
  const [checking, setChecking] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.community_id) return;
    supabase
      .from('communities')
      .select('name')
      .eq('id', profile.community_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.name) setCommunityName(data.name);
      });
  }, [profile?.community_id]);

  const checkAgain = async () => {
    setChecking(true);
    setError(null);
    await refreshProfile();
    setChecking(false);
  };

  const cancelRequest = async () => {
    if (!profile) return;
    setLeaving(true);
    setError(null);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ community_id: null, membership_status: 'active' })
      .eq('id', profile.id);
    if (updateError) {
      setError(updateError.message);
      setLeaving(false);
      return;
    }
    await refreshProfile();
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4 relative">
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2.5 rounded-xl border border-border text-text-secondary hover:text-text-primary hover:border-border-2 transition-all"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      <div className="w-full max-w-lg bg-surface-2 rounded-2xl border border-border p-6 lg:p-8">
        <div className="w-11 h-11 rounded-xl bg-surface-3 border border-border flex items-center justify-center mb-5">
          <Clock className="w-5 h-5 text-text-secondary" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Waiting for approval</h1>
        <p className="text-text-secondary text-sm mt-3 leading-relaxed">
          {profile?.full_name ? `${profile.full_name}, your` : 'Your'} request to join {communityName} is with a coordinator.
          You can use Barter once they approve it.
        </p>
        {error && (
          <div role="alert" className="mt-4 text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-4 py-2.5">
            {error}
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <button
            type="button"
            onClick={checkAgain}
            disabled={checking || leaving}
            className="px-4 py-2.5 rounded-xl bg-accent text-accent-text text-sm font-semibold disabled:opacity-50"
          >
            {checking ? 'Checking...' : 'Check again'}
          </button>
          <button
            type="button"
            onClick={cancelRequest}
            disabled={checking || leaving}
            className="px-4 py-2.5 rounded-xl border border-border text-text-secondary text-sm font-medium disabled:opacity-50"
          >
            {leaving ? 'Cancelling...' : 'Cancel request'}
          </button>
          <button
            type="button"
            onClick={() => signOut()}
            className="px-4 py-2.5 rounded-xl text-text-muted text-sm font-medium"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
