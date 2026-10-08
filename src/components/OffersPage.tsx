import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import type { CommunityData } from '@/lib/useCommunityData';
import { structureOfferInput, CATEGORY_LABELS } from '@/lib/matchingEngine';
import { Plus, Trash2, Clock, Wrench, Gift, Sparkles, X } from 'lucide-react';
import type { Category, SkillLevel } from '@/lib/types';

export default function OffersPage({ data }: { data: CommunityData }) {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [inputText, setInputText] = useState('');
  const [category, setCategory] = useState<Category>('talent');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('intermediate');
  const [availability, setAvailability] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const myOffers = data.offers.filter((o) => o.user_id === user?.id);

  const preview = inputText.trim() ? structureOfferInput(inputText) : null;

  const toggleAvail = (val: string) => {
    setAvailability((prev) => prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]);
  };

  const handleSubmit = async () => {
    if (!inputText.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const structured = structureOfferInput(inputText);
      await data.addOffer({
        title: structured.title,
        description: inputText,
        category: structured.category !== 'talent' ? structured.category : category,
        skill_tags: structured.skill_tags,
        skill_level: (structured.level as SkillLevel) || skillLevel,
        availability,
      });
      setInputText('');
      setAvailability([]);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add offer');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-neutral-400 text-sm">{myOffers.length} active {myOffers.length === 1 ? 'offer' : 'offers'}</p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-neutral-100 text-neutral-950 rounded-xl font-semibold text-sm hover:bg-white transition-all"
        >
          {showForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add Offer</>}
        </button>
      </div>

      {showForm && (
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5 uppercase tracking-wide">Describe what you can offer</label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={3}
              autoFocus
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-50 placeholder-neutral-600 focus:outline-none focus:border-neutral-500 transition-colors resize-none text-sm"
              placeholder="I can help with graphic design, creating logos and visual identities..."
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
                <p className="text-neutral-300"><span className="text-neutral-500">Level:</span> {preview.level.charAt(0).toUpperCase() + preview.level.slice(1)}</p>
                <p className="text-neutral-300"><span className="text-neutral-500">Category:</span> {CATEGORY_LABELS[preview.category as Category]}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-2 uppercase tracking-wide">Availability</label>
            <div className="flex flex-wrap gap-2">
              {['Weekdays', 'Weekends', 'Evenings', 'Mornings', 'Afternoons'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => toggleAvail(opt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    availability.includes(opt)
                      ? 'bg-neutral-100 text-neutral-950'
                      : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-4 py-2">{error}</div>}

          <button
            onClick={handleSubmit}
            disabled={!inputText.trim() || saving}
            className="w-full py-2.5 bg-neutral-100 text-neutral-950 rounded-lg font-semibold text-sm hover:bg-white transition-all disabled:opacity-50"
          >
            {saving ? 'Adding...' : 'Add Offer'}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {myOffers.map((offer) => (
          <div key={offer.id} className="bg-neutral-900 rounded-2xl border border-neutral-800 p-5 group">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <CategoryIcon category={offer.category} />
                  <span className="text-[10px] text-neutral-500 uppercase tracking-wide font-medium">{CATEGORY_LABELS[offer.category as Category]}</span>
                  <span className="text-neutral-700">·</span>
                  <span className="text-[10px] text-neutral-500 capitalize">{offer.skill_level}</span>
                </div>
                <p className="font-medium text-neutral-100 mb-1">{offer.title}</p>
                <p className="text-neutral-500 text-sm">{offer.description}</p>
                {offer.skill_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {offer.skill_tags.map((tag) => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400 capitalize">{tag}</span>
                    ))}
                  </div>
                )}
                {offer.availability.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {offer.availability.map((a) => (
                      <span key={a} className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-800/50 text-neutral-500">{a}</span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => data.removeOffer(offer.id)}
                className="p-2 rounded-lg text-neutral-600 hover:text-red-400 hover:bg-red-950/20 transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {myOffers.length === 0 && !showForm && (
          <div className="text-center py-12">
            <Gift className="w-8 h-8 text-neutral-700 mx-auto mb-3" />
            <p className="text-neutral-500 text-sm">You haven't added any offers yet.</p>
            <p className="text-neutral-600 text-xs mt-1">Share what you can do for your community.</p>
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
