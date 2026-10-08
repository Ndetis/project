import { useState } from 'react';
import type { CommunityData } from '@/lib/useCommunityData';
import { useAuth } from '@/lib/auth';
import { Search, MapPin, Star, Clock, Wrench, Gift } from 'lucide-react';
import { CATEGORY_LABELS } from '@/lib/matchingEngine';
import type { Category } from '@/lib/types';

export default function DiscoverPage({ data }: { data: CommunityData }) {
  const { user } = useAuth();
  const [tab, setTab] = useState<'people' | 'offers' | 'needs'>('people');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');

  const otherMembers = data.members.filter((m) => m.profile.id !== user?.id);
  const otherOffers = data.offers.filter((o) => o.user_id !== user?.id);
  const otherNeeds = data.needs.filter((n) => n.user_id !== user?.id);

  const filteredOffers = otherOffers.filter((o) => {
    const matchesSearch = !search ||
      o.title.toLowerCase().includes(search.toLowerCase()) ||
      o.description.toLowerCase().includes(search.toLowerCase()) ||
      o.skill_tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || o.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredNeeds = otherNeeds.filter((n) => {
    const matchesSearch = !search ||
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.description.toLowerCase().includes(search.toLowerCase()) ||
      n.skill_tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || n.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredMembers = otherMembers.filter((m) => {
    if (!search) return true;
    return m.profile.full_name.toLowerCase().includes(search.toLowerCase()) ||
      m.offers.some((o) => o.title.toLowerCase().includes(search.toLowerCase())) ||
      m.offers.some((o) => o.skill_tags.some((t) => t.toLowerCase().includes(search.toLowerCase())));
  });

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search skills, names, needs..."
            className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors text-sm"
          />
        </div>
        <div className="flex gap-1.5 bg-neutral-900 border border-neutral-800 rounded-xl p-1">
          {(['all', 'time', 'talent', 'treasure'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                categoryFilter === cat ? 'bg-neutral-100 text-neutral-950' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-neutral-900 border border-neutral-800 rounded-xl p-1">
        {([
          { key: 'people' as const, label: 'People', count: filteredMembers.length },
          { key: 'offers' as const, label: 'Offers', count: filteredOffers.length },
          { key: 'needs' as const, label: 'Needs', count: filteredNeeds.length },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-neutral-100 text-neutral-950' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {t.label}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              tab === t.key ? 'bg-neutral-300 text-neutral-900' : 'bg-neutral-800 text-neutral-500'
            }`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'people' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredMembers.map((member) => (
            <div key={member.profile.id} className="bg-neutral-900 rounded-2xl border border-neutral-800 p-5 hover:border-neutral-700 transition-colors">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-neutral-300">{member.profile.full_name.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-neutral-100 truncate">{member.profile.full_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-neutral-500" />
                      <span className="text-xs text-neutral-500">{member.profile.trust_score.toFixed(1)}</span>
                    </div>
                    <span className="text-neutral-700">·</span>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-neutral-500" />
                      <span className="text-xs text-neutral-500">{member.profile.location_zone}</span>
                    </div>
                  </div>
                </div>
              </div>
              {member.profile.bio && (
                <p className="text-neutral-400 text-sm mb-3 line-clamp-2">{member.profile.bio}</p>
              )}
              <div className="space-y-1.5">
                <p className="text-[10px] text-neutral-600 uppercase tracking-wide font-medium">Can offer:</p>
                {member.offers.map((offer) => (
                  <div key={offer.id} className="flex items-center gap-2">
                    <CategoryIcon category={offer.category} />
                    <span className="text-sm text-neutral-300">{offer.title}</span>
                  </div>
                ))}
              </div>
              {member.needs.length > 0 && (
                <div className="mt-3 pt-3 border-t border-neutral-800 space-y-1.5">
                  <p className="text-[10px] text-neutral-600 uppercase tracking-wide font-medium">Needs:</p>
                  {member.needs.map((need) => (
                    <div key={need.id} className="flex items-center gap-2">
                      <Wrench className="w-3 h-3 text-neutral-600" />
                      <span className="text-sm text-neutral-400">{need.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {filteredMembers.length === 0 && (
            <div className="col-span-full text-center py-12 text-neutral-500 text-sm">No members found.</div>
          )}
        </div>
      )}

      {tab === 'offers' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredOffers.map((offer) => {
            const member = data.members.find((m) => m.profile.id === offer.user_id);
            return (
              <div key={offer.id} className="bg-neutral-900 rounded-2xl border border-neutral-800 p-4 hover:border-neutral-700 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <CategoryIcon category={offer.category} />
                  <span className="text-[10px] text-neutral-500 uppercase tracking-wide font-medium">{CATEGORY_LABELS[offer.category as Category]}</span>
                </div>
                <p className="font-medium text-neutral-100 text-sm mb-1">{offer.title}</p>
                <p className="text-neutral-500 text-xs line-clamp-2 mb-3">{offer.description}</p>
                <div className="flex items-center gap-2 pt-3 border-t border-neutral-800">
                  <div className="w-6 h-6 rounded-md bg-neutral-800 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-neutral-400">{member?.profile.full_name.charAt(0) ?? '?'}</span>
                  </div>
                  <span className="text-xs text-neutral-400">{member?.profile.full_name}</span>
                  <span className="text-neutral-700">·</span>
                  <span className="text-xs text-neutral-600 capitalize">{offer.skill_level}</span>
                </div>
                {offer.skill_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {offer.skill_tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-500 capitalize">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {filteredOffers.length === 0 && (
            <div className="col-span-full text-center py-12 text-neutral-500 text-sm">No offers found.</div>
          )}
        </div>
      )}

      {tab === 'needs' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredNeeds.map((need) => {
            const member = data.members.find((m) => m.profile.id === need.user_id);
            return (
              <div key={need.id} className="bg-neutral-900 rounded-2xl border border-neutral-800 p-4 hover:border-neutral-700 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CategoryIcon category={need.category} />
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wide font-medium">{CATEGORY_LABELS[need.category as Category]}</span>
                  </div>
                  <UrgencyBadge urgency={need.urgency} />
                </div>
                <p className="font-medium text-neutral-100 text-sm mb-1">{need.title}</p>
                <p className="text-neutral-500 text-xs line-clamp-2 mb-3">{need.description}</p>
                <div className="flex items-center gap-2 pt-3 border-t border-neutral-800">
                  <div className="w-6 h-6 rounded-md bg-neutral-800 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-neutral-400">{member?.profile.full_name.charAt(0) ?? '?'}</span>
                  </div>
                  <span className="text-xs text-neutral-400">{member?.profile.full_name}</span>
                </div>
              </div>
            );
          })}
          {filteredNeeds.length === 0 && (
            <div className="col-span-full text-center py-12 text-neutral-500 text-sm">No needs found.</div>
          )}
        </div>
      )}
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
