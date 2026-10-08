import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import type { CommunityData } from '@/lib/useCommunityData';
import type { Match } from '@/lib/types';
import { Check, X, Sparkles, Clock, MapPin, Shield, Cloud, ArrowRight, AlertTriangle, Loader2, Calendar } from 'lucide-react';

export default function MatchesPage({ data }: { data: CommunityData }) {
  const { user } = useAuth();
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [rejecting, setRejecting] = useState<string | null>(null);

  const myMatches = data.matches.filter(
    (m) => m.participant_ids.includes(user?.id ?? '') && (m.status === 'pending' || m.status === 'accepted')
  );

  const myExchanges = data.exchanges.filter(
    (e) => e.participant_ids.includes(user?.id ?? '')
  );

  const pendingMatches = myMatches.filter((m) => m.status === 'pending');
  const acceptedMatches = myMatches.filter((m) => m.status === 'accepted');

  if (pendingMatches.length === 0 && acceptedMatches.length === 0 && myExchanges.length === 0) {
    return (
      <div className="text-center py-16">
        <Sparkles className="w-8 h-8 text-neutral-700 mx-auto mb-3" />
        <p className="text-neutral-400 text-sm">No matches yet.</p>
        <p className="text-neutral-600 text-xs mt-1">Add a need and tap "Find Match" to let the AI agent search for exchanges.</p>
      </div>
    );
  }

  const handleAccept = async (matchId: string) => {
    setScheduling(matchId);
  };

  const handleSchedule = async (matchId: string) => {
    setScheduling(matchId);
    const scheduledAt = scheduleDate ? new Date(scheduleDate).toISOString() : null;
    await data.acceptMatch(matchId, scheduledAt);
    setScheduling(null);
    setScheduleDate('');
  };

  const handleReject = async (matchId: string) => {
    setRejecting(matchId);
    await data.rejectMatch(matchId);
    setRejecting(null);
  };

  const handleSelfCorrect = async (matchId: string, participantId: string) => {
    await data.rejectParticipant(matchId, participantId);
  };

  return (
    <div className="space-y-5">
      {/* Pending matches */}
      {pendingMatches.length > 0 && (
        <div>
          <h3 className="text-xs text-neutral-500 uppercase tracking-wide font-medium mb-3">Pending Proposals</h3>
          <div className="space-y-4">
            {pendingMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                expanded={expandedMatch === match.id}
                onToggle={() => setExpandedMatch(expandedMatch === match.id ? null : match.id)}
                onAccept={() => handleAccept(match.id)}
                onReject={() => handleReject(match.id)}
                onSelfCorrect={(pid) => handleSelfCorrect(match.id, pid)}
                isScheduling={scheduling === match.id}
                scheduleDate={scheduleDate}
                onScheduleDateChange={setScheduleDate}
                onSchedule={() => handleSchedule(match.id)}
                isRejecting={rejecting === match.id}
                currentUserId={user?.id ?? ''}
              />
            ))}
          </div>
        </div>
      )}

      {/* Accepted / scheduled exchanges */}
      {acceptedMatches.length > 0 && (
        <div>
          <h3 className="text-xs text-neutral-500 uppercase tracking-wide font-medium mb-3">Accepted Exchanges</h3>
          <div className="space-y-3">
            {acceptedMatches.map((match) => (
              <div key={match.id} className="bg-neutral-900 rounded-2xl border border-neutral-800 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs text-neutral-400 font-medium">Accepted · {match.match_type === 'direct' ? 'Direct' : match.match_type === 'multi_3' ? '3-person' : '4-person'} exchange</span>
                </div>
                <ExchangeChain match={match} currentUserId={user?.id ?? ''} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exchanges with feedback */}
      {myExchanges.length > 0 && (
        <div>
          <h3 className="text-xs text-neutral-500 uppercase tracking-wide font-medium mb-3">Your Exchanges</h3>
          <div className="space-y-3">
            {myExchanges.map((exchange) => (
              <ExchangeRow
                key={exchange.id}
                exchangeId={exchange.id}
                status={exchange.status}
                scheduledAt={exchange.scheduled_at}
                participantIds={exchange.participant_ids}
                data={data}
                currentUserId={user?.id ?? ''}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MatchCard({
  match, expanded, onToggle, onAccept, onReject, onSelfCorrect, isScheduling, scheduleDate, onScheduleDateChange, onSchedule, isRejecting, currentUserId
}: {
  match: Match;
  expanded: boolean;
  onToggle: () => void;
  onAccept: () => void;
  onReject: () => void;
  onSelfCorrect: (participantId: string) => void;
  isScheduling: boolean;
  scheduleDate: string;
  onScheduleDateChange: (v: string) => void;
  onSchedule: () => void;
  isRejecting: boolean;
  currentUserId: string;
}) {
  const matchLabel = match.match_type === 'direct' ? 'Direct Match' : match.match_type === 'multi_3' ? '3-Person Exchange' : '4-Person Exchange';

  return (
    <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">
      {/* Header */}
      <div className="p-5 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-neutral-300" />
            </div>
            <div>
              <p className="font-semibold text-neutral-50 text-sm">{matchLabel}</p>
              <p className="text-neutral-500 text-xs mt-0.5">
                {match.chain.map((c, i) => (
                  <span key={i}>
                    {i > 0 && <span className="text-neutral-700"> → </span>}
                    {c.user_name.split(' ')[0]}
                  </span>
                ))}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-neutral-50">{match.confidence_score}%</p>
            <p className="text-[10px] text-neutral-500 uppercase tracking-wide">confidence</p>
          </div>
        </div>

        {/* Quick chain preview */}
        <div className="bg-neutral-800/30 rounded-xl p-3 mt-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {match.chain.map((link, i) => (
              <div key={i} className="flex items-center gap-2 flex-shrink-0">
                {i > 0 && <ArrowRight className="w-3 h-3 text-neutral-600 flex-shrink-0" />}
                <div className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center ${link.user_id === currentUserId ? 'bg-neutral-100' : 'bg-neutral-800'}`}>
                    <span className={`text-[10px] font-bold ${link.user_id === currentUserId ? 'text-neutral-950' : 'text-neutral-400'}`}>
                      {link.user_name.charAt(0)}
                    </span>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-[10px] text-neutral-500">provides</p>
                    <p className="text-xs text-neutral-300 font-medium truncate max-w-[120px]">{link.provides}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-neutral-800 p-5 space-y-4">
          {/* Full exchange chain */}
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wide font-medium mb-3">Exchange Chain</p>
            <div className="space-y-2">
              {match.chain.map((link, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-neutral-400">{link.user_name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-200">{link.user_name}</p>
                    <p className="text-xs text-neutral-500">
                      <span className="text-neutral-400">provides</span> {link.provides}
                      <span className="text-neutral-700"> · </span>
                      <span className="text-neutral-400">needs</span> {link.needs}
                    </p>
                  </div>
                  {i < match.chain.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-neutral-600" />
                  )}
                </div>
              ))}
              {match.match_type !== 'direct' && (
                <div className="flex items-center gap-3 pt-2">
                  <ArrowRight className="w-4 h-4 text-neutral-600 rotate-90" />
                  <p className="text-xs text-neutral-500">Closes the loop back to {match.chain[0].user_name.split(' ')[0]}</p>
                </div>
              )}
            </div>
          </div>

          {/* Why we matched you */}
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wide font-medium mb-3">Why we matched you</p>
            <div className="grid grid-cols-2 gap-2">
              <ReasoningItem icon={Sparkles} label="Skill Fit" value={`${match.reasoning.skill_fit}%`} />
              <ReasoningItem icon={Clock} label="Availability" value={match.reasoning.availability} />
              <ReasoningItem icon={MapPin} label="Location" value={match.reasoning.location} />
              <ReasoningItem icon={Sparkles} label="Exchange Fit" value={match.reasoning.exchange_fit} />
              <ReasoningItem icon={Shield} label="Community Trust" value={match.reasoning.trust} />
              <ReasoningItem icon={Cloud} label="Weather" value={match.reasoning.weather} />
            </div>
          </div>

          {/* Safety note */}
          <div className="flex items-start gap-2 bg-neutral-800/30 rounded-xl p-3 border border-neutral-800">
            <AlertTriangle className="w-4 h-4 text-neutral-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-neutral-500 leading-relaxed">
              Barter can discover, reason, and suggest. You remain in control.
              Accept, modify, or reject this proposal. No action is taken without your confirmation.
            </p>
          </div>

          {/* Scheduling */}
          {isScheduling && (
            <div className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-800">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-neutral-400" />
                <p className="text-sm font-medium text-neutral-200">Schedule the exchange</p>
              </div>
              <input
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => onScheduleDateChange(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 text-sm focus:outline-none focus:border-neutral-500 transition-colors"
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={onSchedule}
                  className="flex-1 py-2 bg-neutral-100 text-neutral-950 rounded-lg font-medium text-sm hover:bg-white transition-all"
                >
                  Confirm & Schedule
                </button>
                <button
                  onClick={() => onScheduleDateChange('')}
                  className="px-4 py-2 text-neutral-400 text-sm hover:text-neutral-200 transition-colors"
                >
                  No date
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          {!isScheduling && (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={onAccept}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-neutral-100 text-neutral-950 rounded-xl font-semibold text-sm hover:bg-white transition-all"
              >
                <Check className="w-4 h-4" />
                Accept Proposal
              </button>
              <button
                onClick={onReject}
                disabled={isRejecting}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-neutral-800 text-neutral-400 rounded-xl font-medium text-sm hover:text-neutral-200 hover:bg-neutral-700 transition-all disabled:opacity-50"
              >
                {isRejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><X className="w-4 h-4" /> Reject</>}
              </button>
            </div>
          )}

          {/* Self-correction: simulate a participant becoming unavailable */}
          {match.match_type !== 'direct' && (
            <div className="pt-2 border-t border-neutral-800">
              <p className="text-[10px] text-neutral-600 uppercase tracking-wide font-medium mb-2">Demo: Simulate edge case</p>
              <div className="flex flex-wrap gap-1.5">
                {match.participant_ids.filter((pid) => pid !== currentUserId).map((pid) => {
                  const member = match.chain.find((c) => c.user_id === pid);
                  return (
                    <button
                      key={pid}
                      onClick={() => onSelfCorrect(pid)}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-neutral-800 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-700 transition-all"
                    >
                      {member?.user_name.split(' ')[0]} unavailable
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ExchangeChain({ match, currentUserId }: { match: Match; currentUserId: string }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      {match.chain.map((link, i) => (
        <div key={i} className="flex items-center gap-2 flex-shrink-0">
          {i > 0 && <ArrowRight className="w-3 h-3 text-neutral-600" />}
          <div className="flex items-center gap-1.5">
            <div className={`w-6 h-6 rounded-md flex items-center justify-center ${link.user_id === currentUserId ? 'bg-neutral-100' : 'bg-neutral-800'}`}>
              <span className={`text-[10px] font-bold ${link.user_id === currentUserId ? 'text-neutral-950' : 'text-neutral-400'}`}>
                {link.user_name.charAt(0)}
              </span>
            </div>
            <span className="text-xs text-neutral-300">{link.user_name.split(' ')[0]}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReasoningItem({ icon: Icon, label, value }: { icon: typeof Sparkles; label: string; value: string }) {
  const isGood = value === 'Compatible' || value === 'Within range' || value === 'Suitable' || value === 'Excellent' || value === 'Good' || value === 'Strong' || value === 'Direct' || value.includes('%');
  return (
    <div className="flex items-center gap-2 bg-neutral-800/30 rounded-lg p-2.5">
      <Icon className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-neutral-600 uppercase tracking-wide">{label}</p>
        <p className={`text-xs font-medium ${isGood ? 'text-neutral-200' : 'text-neutral-400'}`}>{value}</p>
      </div>
    </div>
  );
}

function ExchangeRow({
  exchangeId, status, scheduledAt, participantIds, data, currentUserId
}: {
  exchangeId: string;
  status: string;
  scheduledAt: string | null;
  participantIds: string[];
  data: CommunityData;
  currentUserId: string;
}) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackTarget, setFeedbackTarget] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [success, setSuccess] = useState(true);
  const [wouldAgain, setWouldAgain] = useState(true);
  const [comments, setComments] = useState('');

  const otherParticipants = participantIds.filter((pid) => pid !== currentUserId);
  const match = data.matches.find((m) => m.id === data.exchanges.find((e) => e.id === exchangeId)?.match_id);

  const handleSubmitFeedback = async (toUserId: string) => {
    await data.submitFeedback(exchangeId, toUserId, success, rating, wouldAgain, comments);
    setShowFeedback(false);
    setFeedbackTarget(null);
    setRating(5);
    setComments('');
    if (status !== 'completed') {
      await data.completeExchange(exchangeId);
    }
  };

  return (
    <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StatusDot status={status} />
          <span className="text-sm font-medium text-neutral-200 capitalize">{status.replace('_', ' ')}</span>
        </div>
        {scheduledAt && (
          <span className="text-xs text-neutral-500">{new Date(scheduledAt).toLocaleDateString()}</span>
        )}
      </div>

      {match && <ExchangeChain match={match} currentUserId={currentUserId} />}

      {status !== 'completed' && status !== 'cancelled' && (
        <div className="mt-3 pt-3 border-t border-neutral-800">
          <button
            onClick={() => setShowFeedback(!showFeedback)}
            className="text-xs text-neutral-400 hover:text-neutral-200 font-medium"
          >
            Mark as completed & give feedback
          </button>
        </div>
      )}

      {showFeedback && (
        <div className="mt-3 pt-3 border-t border-neutral-800 space-y-3">
          <p className="text-xs text-neutral-500 uppercase tracking-wide font-medium">Rate your exchange</p>
          <div className="space-y-2">
            {otherParticipants.map((pid) => {
              const member = data.members.find((m) => m.profile.id === pid);
              return (
                <button
                  key={pid}
                  onClick={() => setFeedbackTarget(pid)}
                  className={`w-full flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
                    feedbackTarget === pid ? 'border-neutral-100 bg-neutral-800/50' : 'border-neutral-800'
                  }`}
                >
                  <div className="w-6 h-6 rounded-md bg-neutral-800 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-neutral-400">{member?.profile.full_name.charAt(0) ?? '?'}</span>
                  </div>
                  <span className="text-xs text-neutral-300">{member?.profile.full_name}</span>
                </button>
              );
            })}
          </div>

          {feedbackTarget && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-neutral-500 mb-1.5">Did it happen?</label>
                <div className="flex gap-2">
                  <button onClick={() => setSuccess(true)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${success ? 'bg-neutral-100 text-neutral-950' : 'bg-neutral-800 text-neutral-400'}`}>Yes</button>
                  <button onClick={() => setSuccess(false)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${!success ? 'bg-neutral-100 text-neutral-950' : 'bg-neutral-800 text-neutral-400'}`}>No</button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1.5">Rating (1-5)</label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setRating(n)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold ${rating === n ? 'bg-neutral-100 text-neutral-950' : 'bg-neutral-800 text-neutral-400'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1.5">Would exchange again?</label>
                <div className="flex gap-2">
                  <button onClick={() => setWouldAgain(true)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${wouldAgain ? 'bg-neutral-100 text-neutral-950' : 'bg-neutral-800 text-neutral-400'}`}>Yes</button>
                  <button onClick={() => setWouldAgain(false)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${!wouldAgain ? 'bg-neutral-100 text-neutral-950' : 'bg-neutral-800 text-neutral-400'}`}>No</button>
                </div>
              </div>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={2}
                placeholder="Comments (optional)"
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 text-sm placeholder-neutral-600 focus:outline-none focus:border-neutral-500 resize-none"
              />
              <button
                onClick={() => handleSubmitFeedback(feedbackTarget)}
                className="w-full py-2 bg-neutral-100 text-neutral-950 rounded-lg font-medium text-sm hover:bg-white transition-all"
              >
                Submit Feedback
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    scheduled: 'bg-blue-500',
    in_progress: 'bg-yellow-500',
    completed: 'bg-green-500',
    cancelled: 'bg-red-500',
  };
  return <div className={`w-2 h-2 rounded-full ${colors[status] ?? 'bg-neutral-600'}`} />;
}
