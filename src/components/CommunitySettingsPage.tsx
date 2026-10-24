import { useState } from 'react';
import type { CommunityData } from '@/lib/useCommunityData';
import type { JoinPolicy } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { Check, Shield, UserPlus, Users } from 'lucide-react';

const MIGRATION_HINT = 'The database update is not on this Supabase project yet. Open the SQL editor, run supabase/migrations/20261024010000_join_policy_and_demo.sql, then try again.';

function messageFrom(err: { code?: string; message?: string } | null): string {
  if (!err) return 'Something went wrong. Please try again.';
  if (err.code === 'PGRST202' || err.code === '42703' || err.message?.includes('schema cache')) return MIGRATION_HINT;
  return err.message || 'Something went wrong. Please try again.';
}

export default function CommunitySettingsPage({ data }: { data: CommunityData }) {
  const [savingPolicy, setSavingPolicy] = useState<JoinPolicy | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const community = data.community;
  const policy = community?.join_policy ?? 'open';

  const savePolicy = async (next: JoinPolicy) => {
    if (!community || next === policy) return;
    setSavingPolicy(next);
    setError(null);
    setNotice(null);
    const { error: updateError } = await supabase
      .from('communities')
      .update({ join_policy: next })
      .eq('id', community.id);
    if (updateError) setError(messageFrom(updateError));
    else setNotice(next === 'approval' ? 'New members now wait for your approval.' : 'People can join this community directly.');
    setSavingPolicy(null);
    await data.refresh();
  };

  const review = async (userId: string, decision: 'active' | 'rejected') => {
    setReviewingId(userId);
    setError(null);
    setNotice(null);
    const { error: reviewError } = await supabase.rpc('review_join_request', {
      target_user: userId,
      decision,
    });
    if (reviewError) setError(messageFrom(reviewError));
    else setNotice(decision === 'active' ? 'Request approved.' : 'Request declined.');
    setReviewingId(null);
    await data.refresh();
  };

  const loadSamples = async () => {
    if (!community) return;
    setSeeding(true);
    setError(null);
    setNotice(null);
    const { data: result, error: seedError } = await supabase.rpc('seed_community_demo', {
      p_community: community.id,
      p_fixed_demo: false,
    });
    if (seedError) setError(messageFrom(seedError));
    else setNotice(typeof result === 'string' ? result : 'Sample members added.');
    setSeeding(false);
    await data.refresh();
  };

  if (!community) {
    return <p className="text-neutral-500 text-sm">This community is still loading.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6">
        <div className="flex items-start gap-3 mb-5">
          <Shield className="w-5 h-5 text-neutral-400 mt-0.5" />
          <div>
            <h2 className="text-lg font-semibold text-neutral-100">Who can join {community.name}</h2>
            <p className="text-neutral-500 text-sm mt-1">
              Choose whether people enter as soon as they ask, or wait until you approve them.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <PolicyCard
            title="Join directly"
            description="Anyone who selects this community becomes a member immediately."
            selected={policy === 'open'}
            busy={savingPolicy === 'open'}
            onClick={() => savePolicy('open')}
          />
          <PolicyCard
            title="Approval required"
            description="People can request to join. They stay outside until you approve them."
            selected={policy === 'approval'}
            busy={savingPolicy === 'approval'}
            onClick={() => savePolicy('approval')}
          />
        </div>
      </div>

      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-4 h-4 text-neutral-400" />
          <h3 className="font-semibold text-neutral-200 text-sm uppercase tracking-wide">Waiting for approval</h3>
          <span className="text-xs text-neutral-500">{data.pendingMembers.length}</span>
        </div>
        {policy === 'open' && (
          <p className="text-neutral-500 text-sm mb-3">Direct join is on, so new people will not appear here.</p>
        )}
        {data.pendingMembers.length === 0 ? (
          <p className="text-neutral-500 text-sm">No one is waiting.</p>
        ) : (
          <div className="space-y-3">
            {data.pendingMembers.map((member) => (
              <div key={member.id} className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 border-b border-neutral-800 last:border-0">
                <div className="flex-1">
                  <p className="text-neutral-100 text-sm font-medium">{member.full_name}</p>
                  <p className="text-neutral-500 text-xs mt-0.5">{member.bio || member.location_zone || 'Asked to join'}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => review(member.id, 'active')}
                    disabled={reviewingId === member.id}
                    className="px-3 py-2 rounded-lg bg-neutral-100 text-neutral-950 text-xs font-semibold disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => review(member.id, 'rejected')}
                    disabled={reviewingId === member.id}
                    className="px-3 py-2 rounded-lg border border-neutral-700 text-neutral-300 text-xs font-semibold disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-neutral-400 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-neutral-100">Sample members</h3>
            <p className="text-neutral-500 text-sm mt-1">
              Add a small neighborhood so you can see offers, needs, a proposed match, and one person waiting for approval. Sample password: password123.
            </p>
            <button
              type="button"
              onClick={loadSamples}
              disabled={seeding}
              className="mt-4 px-4 py-2.5 rounded-xl bg-neutral-100 text-neutral-950 text-sm font-semibold disabled:opacity-50"
            >
              {seeding ? 'Adding sample members...' : 'Add sample members'}
            </button>
          </div>
        </div>
      </div>

      {notice && (
        <div role="status" className="text-sm text-neutral-300 bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2.5">
          {notice}
        </div>
      )}
      {error && (
        <div role="alert" className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-4 py-2.5">
          {error}
        </div>
      )}
    </div>
  );
}

function PolicyCard({
  title, description, selected, busy, onClick,
}: {
  title: string;
  description: string;
  selected: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`text-left p-4 rounded-xl border transition-all ${
        selected ? 'border-neutral-100 bg-neutral-800' : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium text-neutral-100">{title}</p>
        {selected && <Check className="w-4 h-4 text-neutral-100" />}
      </div>
      <p className="text-neutral-500 text-xs mt-2">{busy ? 'Saving...' : description}</p>
    </button>
  );
}
