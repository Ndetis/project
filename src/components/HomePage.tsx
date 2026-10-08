import { useAuth } from '@/lib/auth';
import type { CommunityData } from '@/lib/useCommunityData';
import type { PageKey } from './Layout';
import { Sparkles, ArrowRight, Clock, Wrench, Gift, TrendingUp, Users, Activity } from 'lucide-react';
import { CATEGORY_LABELS } from '@/lib/matchingEngine';

interface HomeProps {
  data: CommunityData;
  onNavigate: (page: PageKey) => void;
}

export default function HomePage({ data, onNavigate }: HomeProps) {
  const { user, profile } = useAuth();

  const myOffers = data.offers.filter((o) => o.user_id === user?.id);
  const myNeeds = data.needs.filter((n) => n.user_id === user?.id);
  const pendingMatches = data.matches.filter((m) => m.status === 'pending');
  const activeExchanges = data.exchanges.filter((e) => e.status === 'scheduled' || e.status === 'in_progress');
  const completedExchanges = data.exchanges.filter((e) => e.status === 'completed');

  const otherOffers = data.offers.filter((o) => o.user_id !== user?.id);
  const otherNeeds = data.needs.filter((n) => n.user_id !== user?.id);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 lg:p-8">
        <p className="text-neutral-500 text-sm mb-1">Welcome back,</p>
        <h2 className="text-2xl font-bold text-neutral-50 tracking-tight">{profile?.full_name}</h2>
        <p className="text-neutral-400 text-sm mt-2 max-w-lg">
          You have something. Someone needs something. Let's connect.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Your Offers" value={myOffers.length} icon={Gift} />
        <StatCard label="Your Needs" value={myNeeds.length} icon={Wrench} />
        <StatCard label="Pending Matches" value={pendingMatches.length} icon={Sparkles} />
        <StatCard label="Community Members" value={data.members.length} icon={Users} />
      </div>

      {/* Magic Moment - Quick summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* You can offer */}
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="w-4 h-4 text-neutral-400" />
            <h3 className="font-semibold text-neutral-200 text-sm uppercase tracking-wide">You can offer</h3>
          </div>
          {myOffers.length === 0 ? (
            <p className="text-neutral-500 text-sm">No offers yet. Add one to start helping your community.</p>
          ) : (
            <div className="space-y-2">
              {myOffers.map((offer) => (
                <div key={offer.id} className="flex items-center justify-between py-2 border-b border-neutral-800 last:border-0">
                  <div>
                    <p className="text-neutral-200 text-sm font-medium">{offer.title}</p>
                    <p className="text-neutral-500 text-xs">{CATEGORY_LABELS[offer.category as keyof typeof CATEGORY_LABELS]} · {offer.skill_level}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => onNavigate('offers')}
            className="mt-3 text-xs text-neutral-400 hover:text-neutral-100 flex items-center gap-1 transition-colors"
          >
            Manage offers <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* You need */}
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="w-4 h-4 text-neutral-400" />
            <h3 className="font-semibold text-neutral-200 text-sm uppercase tracking-wide">You need</h3>
          </div>
          {myNeeds.length === 0 ? (
            <p className="text-neutral-500 text-sm">No needs yet. Tell us what you need help with.</p>
          ) : (
            <div className="space-y-2">
              {myNeeds.map((need) => (
                <div key={need.id} className="flex items-center justify-between py-2 border-b border-neutral-800 last:border-0">
                  <div>
                    <p className="text-neutral-200 text-sm font-medium">{need.title}</p>
                    <p className="text-neutral-500 text-xs">Urgency: {need.urgency}</p>
                  </div>
                  <button
                    onClick={() => onNavigate('matches')}
                    className="text-xs px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors"
                  >
                    Find match
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => onNavigate('needs')}
            className="mt-3 text-xs text-neutral-400 hover:text-neutral-100 flex items-center gap-1 transition-colors"
          >
            Manage needs <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Pending matches */}
      {pendingMatches.length > 0 && (
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-neutral-400" />
            <h3 className="font-semibold text-neutral-200 text-sm uppercase tracking-wide">Suggested Matches</h3>
          </div>
          <div className="space-y-3">
            {pendingMatches.slice(0, 3).map((match) => (
              <div key={match.id} className="flex items-center justify-between p-3 rounded-xl bg-neutral-800/50 border border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center">
                    <span className="text-xs font-bold text-neutral-300">{match.confidence_score}%</span>
                  </div>
                  <div>
                    <p className="text-neutral-200 text-sm font-medium">
                      {match.match_type === 'direct' ? 'Direct match' : match.match_type === 'multi_3' ? '3-person exchange' : '4-person exchange'}
                    </p>
                    <p className="text-neutral-500 text-xs">
                      {match.chain.map((c) => c.user_name.split(' ')[0]).join(' → ')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('matches')}
                  className="text-xs px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-950 font-medium hover:bg-white transition-colors"
                >
                  Review
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active exchanges */}
      {activeExchanges.length > 0 && (
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-neutral-400" />
            <h3 className="font-semibold text-neutral-200 text-sm uppercase tracking-wide">Upcoming Exchanges</h3>
          </div>
          <div className="space-y-2">
            {activeExchanges.map((ex) => (
              <div key={ex.id} className="flex items-center justify-between p-3 rounded-xl bg-neutral-800/50 border border-neutral-800">
                <div>
                  <p className="text-neutral-200 text-sm font-medium capitalize">{ex.status}</p>
                  <p className="text-neutral-500 text-xs">
                    {ex.scheduled_at ? new Date(ex.scheduled_at).toLocaleDateString() : 'Not yet scheduled'} · {ex.participant_ids.length} participants
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Community activity preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-neutral-400" />
              <h3 className="font-semibold text-neutral-200 text-sm uppercase tracking-wide">Community Offers</h3>
            </div>
            <button onClick={() => onNavigate('discover')} className="text-xs text-neutral-400 hover:text-neutral-100">View all</button>
          </div>
          <div className="space-y-2">
            {otherOffers.slice(0, 4).map((offer) => {
              const member = data.members.find((m) => m.profile.id === offer.user_id);
              return (
                <div key={offer.id} className="flex items-center gap-3 py-2 border-b border-neutral-800 last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-neutral-400">{member?.profile.full_name.charAt(0) ?? '?'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-neutral-200 text-sm font-medium truncate">{offer.title}</p>
                    <p className="text-neutral-500 text-xs truncate">{member?.profile.full_name}</p>
                  </div>
                </div>
              );
            })}
            {otherOffers.length === 0 && <p className="text-neutral-500 text-sm">No community offers yet.</p>}
          </div>
        </div>

        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-neutral-400" />
              <h3 className="font-semibold text-neutral-200 text-sm uppercase tracking-wide">Community Needs</h3>
            </div>
            <button onClick={() => onNavigate('discover')} className="text-xs text-neutral-400 hover:text-neutral-100">View all</button>
          </div>
          <div className="space-y-2">
            {otherNeeds.slice(0, 4).map((need) => {
              const member = data.members.find((m) => m.profile.id === need.user_id);
              return (
                <div key={need.id} className="flex items-center gap-3 py-2 border-b border-neutral-800 last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-neutral-400">{member?.profile.full_name.charAt(0) ?? '?'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-neutral-200 text-sm font-medium truncate">{need.title}</p>
                    <p className="text-neutral-500 text-xs truncate">{member?.profile.full_name} · {need.urgency} urgency</p>
                  </div>
                </div>
              );
            })}
            {otherNeeds.length === 0 && <p className="text-neutral-500 text-sm">No community needs yet.</p>}
          </div>
        </div>
      </div>

      {/* Completed exchanges */}
      {completedExchanges.length > 0 && (
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-5">
          <h3 className="font-semibold text-neutral-200 text-sm uppercase tracking-wide mb-3">Completed Exchanges</h3>
          <p className="text-neutral-400 text-sm">{completedExchanges.length} exchanges have been completed in your community.</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Home }) {
  return (
    <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-4">
      <Icon className="w-4 h-4 text-neutral-500 mb-2" />
      <p className="text-2xl font-bold text-neutral-50">{value}</p>
      <p className="text-xs text-neutral-500 mt-0.5">{label}</p>
    </div>
  );
}
