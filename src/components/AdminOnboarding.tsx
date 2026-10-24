import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { ArrowRight, ArrowLeft, Check, Sun, Moon, Shield, Users } from 'lucide-react';
import type { JoinPolicy } from '@/lib/types';

const STEPS = [
  {
    key: 'welcome',
    title: 'Set up your community',
    subtitle: 'As a coordinator, you open the community that members join.',
  },
  {
    key: 'details',
    title: 'Name your community',
    subtitle: 'Members will see this name when they choose where to belong.',
  },
  {
    key: 'access',
    title: 'How people join',
    subtitle: 'You can change this later from the community settings.',
  },
  {
    key: 'review',
    title: 'Open the community',
    subtitle: 'Confirm the details. Members will see this community when they sign up.',
  },
] as const;

function messageFrom(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') return err.message;
  return 'Something went wrong. Please try again.';
}

export default function AdminOnboarding() {
  const { user, profile, refreshProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [joinPolicy, setJoinPolicy] = useState<JoinPolicy>('open');
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canProceed = STEPS[step].key !== 'details' || name.trim().length > 0;
  const isLastStep = step === STEPS.length - 1;
  const inputClass = 'w-full px-4 py-3 bg-surface-2 border border-border rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-border-2 transition-colors';

  const handleCreate = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);
    setError(null);

    try {
      let communityId = createdId;
      if (!communityId) {
        const { data: created, error: insertError } = await supabase
          .from('communities')
          .insert({ name: name.trim(), description: description.trim(), join_policy: joinPolicy })
          .select('*')
          .single();
        if (insertError) throw new Error(insertError.message);
        communityId = created.id;
        setCreatedId(created.id);
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          community_id: communityId,
          membership_status: 'active',
          onboarding_complete: true,
        })
        .eq('id', user.id);
      if (profileError) throw new Error(profileError.message);

      await refreshProfile();
    } catch (err) {
      setError(messageFrom(err));
      setSaving(false);
    }
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

      <div className="w-full max-w-2xl">
        <div className="flex gap-1.5 mb-8">
          {STEPS.map((item, i) => (
            <div
              key={item.key}
              className={`h-1 flex-1 rounded-full transition-all ${i <= step ? 'bg-accent' : 'bg-border'}`}
            />
          ))}
        </div>

        <div className="bg-surface-2 rounded-2xl border border-border p-6 lg:p-8">
          <div className="mb-1 text-xs text-text-tertiary font-medium tracking-wider uppercase">
            Coordinator · Step {step + 1} of {STEPS.length}
          </div>
          <h2 className="text-2xl font-bold text-text-primary tracking-tight mb-2">{STEPS[step].title}</h2>
          <p className="text-text-secondary text-sm mb-6">{STEPS[step].subtitle}</p>

          <div className="min-h-[200px]">
            {STEPS[step].key === 'welcome' && (
              <div className="space-y-4">
                <p className="text-text-primary leading-relaxed">
                  Hi{profile?.full_name ? `, ${profile.full_name}` : ''}. You registered as a community coordinator.
                </p>
                <p className="text-text-secondary text-sm leading-relaxed">
                  Members can only join a community that already exists. Your first step is to create one:
                  give it a name and a short description, then it appears when people sign up.
                </p>
                <div className="bg-surface-3 rounded-xl p-4 border border-border flex items-start gap-3">
                  <Shield className="w-5 h-5 text-text-secondary flex-shrink-0 mt-0.5" />
                  <p className="text-text-secondary text-sm">
                    You will be the coordinator of this community. Members who join it can offer time, talent, and treasure to each other.
                  </p>
                </div>
              </div>
            )}

            {STEPS[step].key === 'details' && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="community-name" className="block text-xs font-medium text-text-tertiary mb-1.5 uppercase tracking-wide">
                    Community name
                  </label>
                  <input
                    id="community-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={80}
                    autoFocus
                    className={inputClass}
                    placeholder="MPE Community"
                  />
                </div>
                <div>
                  <label htmlFor="community-description" className="block text-xs font-medium text-text-tertiary mb-1.5 uppercase tracking-wide">
                    Description
                  </label>
                  <textarea
                    id="community-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={400}
                    rows={4}
                    className={`${inputClass} resize-none`}
                    placeholder="A neighborhood group where neighbors exchange practical help."
                  />
                </div>
              </div>
            )}

            {STEPS[step].key === 'access' && (
              <div className="space-y-3">
                <PolicyChoice
                  title="Join directly"
                  description="Anyone who selects this community becomes a member immediately."
                  selected={joinPolicy === 'open'}
                  onClick={() => setJoinPolicy('open')}
                />
                <PolicyChoice
                  title="Approval required"
                  description="People can ask to join, and they wait until you approve them."
                  selected={joinPolicy === 'approval'}
                  onClick={() => setJoinPolicy('approval')}
                />
              </div>
            )}

            {STEPS[step].key === 'review' && (
              <div className="bg-surface-3 rounded-xl p-5 border border-border">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-accent-text" />
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">{name.trim()}</p>
                    <p className="text-text-secondary text-sm mt-1">
                      {description.trim() || 'No description yet. Members will still be able to find it by name.'}
                    </p>
                    <p className="text-text-muted text-xs mt-3">
                      Coordinator · {profile?.full_name || 'You'} · {joinPolicy === 'approval' ? 'Approval required' : 'Join directly'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div role="alert" className="mt-4 text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-4 py-2.5">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between mt-8">
            <button
              type="button"
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              disabled={step === 0 || saving}
              className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-sm font-medium disabled:opacity-30 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            {isLastStep ? (
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving || !name.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-accent text-accent-text rounded-xl font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50"
              >
                {saving ? 'Creating community...' : 'Create community'}
                <Check className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep((current) => current + 1)}
                disabled={!canProceed}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-accent text-accent-text rounded-xl font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PolicyChoice({
  title, description, selected, onClick,
}: {
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-start justify-between gap-4 p-4 rounded-xl border text-left transition-all ${
        selected ? 'border-accent bg-surface-3' : 'border-border bg-surface-2 hover:border-border-2'
      }`}
    >
      <div>
        <p className={`font-medium ${selected ? 'text-text-primary' : 'text-text-secondary'}`}>{title}</p>
        <p className="text-text-muted text-xs mt-1">{description}</p>
      </div>
      {selected && <Check className="w-5 h-5 text-text-primary flex-shrink-0" />}
    </button>
  );
}
