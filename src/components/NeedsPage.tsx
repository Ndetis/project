import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import type { CommunityData } from '@/lib/useCommunityData';
import { structureNeedInput, CATEGORY_LABELS } from '@/lib/matchingEngine';
import { Plus, Trash2, Clock, Wrench, Gift, Sparkles, X, Search, Loader2 } from 'lucide-react';
import type { Category, Urgency } from '@/lib/types';

export default function NeedsPage({ data }: { data: CommunityData }) {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [inputText, setInputText] = useState('');
  const [urgency, setUrgency] = useState<Urgency>('medium');
  const [frequency, setFrequency] = useState<string>('one-time');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [matching, setMatching] = useState<string | null>(null);

  const myNeeds = data.needs.filter((n) => n.user_id === user?.id);

  const preview = inputText.trim() ? structureNeedInput(inputText) : null;

  const handleSubmit = async () => {
    if (!inputText.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const structured = structureNeedInput(inputText);
      await data.addNeed({
        title: structured.title,
        description: inputText,
        category: structured.category,
        skill_tags: structured.skill_tags,
        urgency: (structured.urgency as Urgency) || urgency,
        frequency: frequency as 'one-time' | 'occasional' | 'regular',
      });
      setInputText('');
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add need');
    }
    setSaving(false);
  };

  const handleFindMatch = async (needId: string) => {
    setMatching(needId);
    await data.runMatching(needId);
    setMatching(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-neutral-400 text-sm">{myNeeds.length} active {myNeeds.length === 1 ? 'need' : 'needs'}</p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-neutral-100 text-neutral-950 rounded-xl font-semibold text-sm hover:bg-white transition-all"
        >
          {showForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add Need</>}
        </button>
      </div>

      {showForm && (
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5 uppercase tracking-wide">What do you need help with?</label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={3}
              autoFocus
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-50 placeholder-neutral-600 focus:outline-none focus:border-neutral-500 transition-colors resize-none text-sm"
              placeholder="I need someone to help me create a logo and occasionally help with accounting..."
            />
          </div>

          {preview && (
            <div className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-800">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-neutral-400" />
                <p className="text-xs text-neutral-400 font-medium uppercase tracking-wide">Barter understood:</p>
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-neutral-300"><span className="text-neutral-500">Title:</span> {preview.title}</p>
                <p className="text-neutral-300"><span className="text-neutral-500">Skills:</span> {preview.skill_tags.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(', ') || 'General'}</p>
                <p className="text-neutral-300"><span className="text-neutral-500">Category:</span> {CATEGORY_LABELS[preview.category as Category]}</p>
                <p className="text-neutral-300"><span className="text-neutral-500">Urgency:</span> {preview.urgency.charAt(0).toUpperCase() + preview.urgency.slice(1)}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-2 uppercase tracking-wide">Frequency</label>
              <div className="flex gap-1.5">
                {(['one-time', 'occasional', 'regular'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFrequency(f)}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                      frequency === f ? 'bg-neutral-100 text-neutral-950' : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {f.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-4 py-2">{error}</div>}

          <button
            onClick={handleSubmit}
            disabled={!inputText.trim() || saving}
            className="w-full py-2.5 bg-neutral-100 text-neutral-950 rounded-lg font-semibold text-sm hover:bg-white transition-all disabled:opacity-50"
          >
            {saving ? 'Adding...' : 'Add Need'}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {myNeeds.map((need) => (
          <div key={need.id} className="bg-neutral-900 rounded-2xl border border-neutral-800 p-5 group">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <CategoryIcon category={need.category} />
                  <span className="text-[10px] text-neutral-500 uppercase tracking-wide font-medium">{CATEGORY_LABELS[need.category as Category]}</span>
                  <span className="text-neutral-700">·</span>
                  <UrgencyBadge urgency={need.urgency} />
                </div>
                <p className="font-medium text-neutral-100 mb-1">{need.title}</p>
                <p className="text-neutral-500 text-sm">{need.description}</p>
                {need.skill_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {need.skill_tags.map((tag) => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400 capitalize">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={() => handleFindMatch(need.id)}
                  disabled={matching === need.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-950 font-medium text-xs hover:bg-white transition-all disabled:opacity-50 whitespace-nowrap"
                >
                  {matching === need.id ? <><Loader2 className="w-3 h-3 animate-spin" /> Searching...</> : <><Search className="w-3 h-3" /> Find Match</>}
                </button>
                <button
                  onClick={() => data.removeNeed(need.id)}
                  className="p-2 rounded-lg text-neutral-600 hover:text-red-400 hover:bg-red-950/20 transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {myNeeds.length === 0 && !showForm && (
          <div className="text-center py-12">
            <Wrench className="w-8 h-8 text-neutral-700 mx-auto mb-3" />
            <p className="text-neutral-500 text-sm">You haven't added any needs yet.</p>
            <p className="text-neutral-600 text-xs mt-1">Tell us what you need help with.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryIcon({ category }: { category: string }) {
  if (category === 'time') return <Clock className="w-3.5 h-3.5 text-neutral-500" />;
  if (category === 'talent') return <Wrench className="w-3.5 h-3.5 text-neutral-500" />;
  return <Gift className="w-3.5 h-3.5 text-neutral-500" />;
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const styles: Record<string, string> = {
    high: 'bg-neutral-200 text-neutral-900',
    medium: 'bg-neutral-700 text-neutral-300',
    low: 'bg-neutral-800 text-neutral-500',
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md capitalize ${styles[urgency] ?? styles.medium}`}>
      {urgency}
    </span>
  );
}
