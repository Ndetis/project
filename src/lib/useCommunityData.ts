import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';
import type { Offer, Need, Profile, Match, Exchange, AgentLog, Notification, Community } from './types';
import { runMatchingAgent, selfCorrectAndRetry, type MatchCandidate, type AgentRunResult } from './matchingEngine';

export interface MemberData {
  profile: Profile;
  offers: Offer[];
  needs: Need[];
}

export interface CommunityData {
  community: Community | null;
  members: MemberData[];
  offers: Offer[];
  needs: Need[];
  matches: Match[];
  exchanges: Exchange[];
  agentLogs: AgentLog[];
  notifications: Notification[];
  loading: boolean;
  refresh: () => Promise<void>;
  runMatching: (needId: string) => Promise<AgentRunResult | null>;
  rejectParticipant: (matchId: string, participantId: string) => Promise<AgentRunResult | null>;
  acceptMatch: (matchId: string, scheduledAt: string | null) => Promise<void>;
  rejectMatch: (matchId: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  addOffer: (offer: Partial<Offer>) => Promise<void>;
  addNeed: (need: Partial<Need>) => Promise<void>;
  removeOffer: (id: string) => Promise<void>;
  removeNeed: (id: string) => Promise<void>;
  completeExchange: (exchangeId: string) => Promise<void>;
  submitFeedback: (exchangeId: string, toUserId: string, success: boolean, rating: number, wouldAgain: boolean, comments: string) => Promise<void>;
}

export function useCommunityData(): CommunityData {
  const { user, profile } = useAuth();
  const [community, setCommunity] = useState<Community | null>(null);
  const [members, setMembers] = useState<MemberData[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const communityId = profile?.community_id;

  const refresh = useCallback(async () => {
    if (!communityId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const [offersRes, needsRes, matchesRes, exchangesRes, logsRes, notifRes, profilesRes] = await Promise.all([
      supabase.from('offers').select('*').eq('community_id', communityId).eq('is_active', true),
      supabase.from('needs').select('*').eq('community_id', communityId),
      supabase.from('matches').select('*').eq('community_id', communityId).order('created_at', { ascending: false }).limit(50),
      supabase.from('exchanges').select('*').eq('community_id', communityId).order('created_at', { ascending: false }).limit(50),
      supabase.from('agent_logs').select('*').eq('community_id', communityId).order('created_at', { ascending: false }).limit(20),
      supabase.from('notifications').select('*').eq('user_id', user?.id ?? '').order('created_at', { ascending: false }).limit(20),
      supabase.from('profiles').select('*').eq('community_id', communityId),
    ]);

    if (offersRes.data) setOffers(offersRes.data as Offer[]);
    if (needsRes.data) setNeeds((needsRes.data as Need[]).filter((n) => n.status === 'active'));
    if (matchesRes.data) setMatches(matchesRes.data as Match[]);
    if (exchangesRes.data) setExchanges(exchangesRes.data as Exchange[]);
    if (logsRes.data) setAgentLogs(logsRes.data as AgentLog[]);
    if (notifRes.data) setNotifications(notifRes.data as Notification[]);
    if (profilesRes.data) {
      const profiles = profilesRes.data as Profile[];
      const commRes = await supabase.from('communities').select('*').eq('id', communityId).maybeSingle();
      if (commRes.data) setCommunity(commRes.data as Community);

      const memberData: MemberData[] = [];
      for (const p of profiles) {
        const memberOffers = offersRes.data?.filter((o) => o.user_id === p.id) ?? [];
        const memberNeeds = (needsRes.data as Need[])?.filter((n) => n.user_id === p.id && n.status === 'active') ?? [];
        memberData.push({ profile: p, offers: memberOffers, needs: memberNeeds });
      }
      setMembers(memberData);
    }

    setLoading(false);
  }, [communityId, user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const runMatching = useCallback(async (needId: string): Promise<AgentRunResult | null> => {
    if (!communityId || !user || !profile) return null;

    const need = needs.find((n) => n.id === needId);
    if (!need) return null;

    // Build member data for the matching engine
    const triggerMember: MemberData = {
      profile,
      offers: offers.filter((o) => o.user_id === user.id),
      needs: needs.filter((n) => n.user_id === user.id),
    };
    const otherMembers = members.filter((m) => m.profile.id !== user.id);
    const allMembers = [triggerMember, ...otherMembers];

    const result = runMatchingAgent(need, allMembers, profile);

    // Store agent log
    await supabase.from('agent_logs').insert({
      community_id: communityId,
      session_type: 'match',
      trigger_need_id: needId,
      log_entries: result.logs,
      result_summary: result.result_summary,
    });

    // Store top candidates as matches
    for (const candidate of result.candidates.slice(0, 5)) {
      await supabase.from('matches').insert({
        community_id: communityId,
        match_type: candidate.match_type,
        participant_ids: candidate.participant_ids,
        chain: candidate.chain,
        confidence_score: candidate.confidence_score,
        reasoning: candidate.reasoning,
        status: 'pending',
      });
    }

    // Create notifications for all participants
    for (const candidate of result.candidates.slice(0, 3)) {
      for (const pid of candidate.participant_ids) {
        if (pid === user.id) continue;
        await supabase.from('notifications').insert({
          user_id: pid,
          community_id: communityId,
          type: 'match_proposal',
          title: 'Barter found a possible exchange',
          body: `A ${candidate.match_type === 'direct' ? 'direct' : candidate.match_type === 'multi_3' ? '3-person' : '4-person'} exchange has been proposed with ${candidate.confidence_score}% confidence.`,
        });
      }
    }

    await refresh();
    return result;
  }, [communityId, user, profile, needs, offers, members, refresh]);

  const rejectParticipant = useCallback(async (matchId: string, participantId: string): Promise<AgentRunResult | null> => {
    if (!communityId || !user || !profile) return null;

    const match = matches.find((m) => m.id === matchId);
    if (!match) return null;

    // Find the trigger need (the first participant's need in the chain)
    const triggerLink = match.chain[0];
    const triggerNeed = needs.find((n) => n.user_id === triggerLink.user_id && n.title === triggerLink.needs);
    if (!triggerNeed) return null;

    const triggerMember: MemberData = {
      profile,
      offers: offers.filter((o) => o.user_id === user.id),
      needs: needs.filter((n) => n.user_id === user.id),
    };
    const otherMembers = members.filter((m) => m.profile.id !== user.id);
    const allMembers = [triggerMember, ...otherMembers];

    const originalResult: AgentRunResult = {
      candidates: matches.map((m) => ({
        chain: m.chain,
        match_type: m.match_type,
        confidence_score: m.confidence_score,
        reasoning: m.reasoning,
        participant_ids: m.participant_ids,
      })),
      logs: [],
      result_summary: '',
    };

    const result = selfCorrectAndRetry(originalResult, participantId, allMembers, triggerNeed, profile);

    // Log the self-correction
    await supabase.from('agent_logs').insert({
      community_id: communityId,
      session_type: 'self_correct',
      trigger_need_id: triggerNeed.id,
      log_entries: result.logs,
      result_summary: result.result_summary,
    });

    // Mark the old match as cancelled
    await supabase.from('matches').update({ status: 'cancelled' }).eq('id', matchId);

    // Store new candidates
    for (const candidate of result.candidates.slice(0, 5)) {
      await supabase.from('matches').insert({
        community_id: communityId,
        match_type: candidate.match_type,
        participant_ids: candidate.participant_ids,
        chain: candidate.chain,
        confidence_score: candidate.confidence_score,
        reasoning: candidate.reasoning,
        status: 'pending',
      });
    }

    await refresh();
    return result;
  }, [communityId, user, profile, matches, needs, offers, members, refresh]);

  const acceptMatch = useCallback(async (matchId: string, scheduledAt: string | null) => {
    if (!communityId) return;
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;

    await supabase.from('matches').update({ status: 'accepted' }).eq('id', matchId);

    const { data: exchangeData } = await supabase.from('exchanges').insert({
      match_id: matchId,
      community_id: communityId,
      participant_ids: match.participant_ids,
      status: 'scheduled',
      scheduled_at: scheduledAt,
    }).select('*').single();

    // Notify participants
    for (const pid of match.participant_ids) {
      if (pid === user?.id) continue;
      await supabase.from('notifications').insert({
        user_id: pid,
        community_id: communityId,
        type: 'exchange_accepted',
        title: 'Exchange accepted',
        body: 'An exchange has been accepted and scheduled.',
        related_id: exchangeData?.id,
      });
    }

    await refresh();
  }, [communityId, matches, user?.id, refresh]);

  const rejectMatch = useCallback(async (matchId: string) => {
    await supabase.from('matches').update({ status: 'rejected' }).eq('id', matchId);
    await refresh();
  }, [refresh]);

  const markNotificationRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  }, []);

  const addOffer = useCallback(async (offer: Partial<Offer>) => {
    if (!user || !communityId) return;
    const { error } = await supabase.from('offers').insert({
      user_id: user.id,
      community_id: communityId,
      category: offer.category ?? 'talent',
      title: offer.title ?? 'Untitled',
      description: offer.description ?? '',
      skill_tags: offer.skill_tags ?? [],
      skill_level: offer.skill_level ?? 'intermediate',
      availability: offer.availability ?? [],
      is_active: true,
    });
    if (error) throw error;
    await refresh();
  }, [user, communityId, refresh]);

  const addNeed = useCallback(async (need: Partial<Need>) => {
    if (!user || !communityId) return;
    const { error } = await supabase.from('needs').insert({
      user_id: user.id,
      community_id: communityId,
      category: need.category ?? 'talent',
      title: need.title ?? 'Untitled',
      description: need.description ?? '',
      skill_tags: need.skill_tags ?? [],
      urgency: need.urgency ?? 'medium',
      frequency: need.frequency ?? 'one-time',
      status: 'active',
    });
    if (error) throw error;
    await refresh();
  }, [user, communityId, refresh]);

  const removeOffer = useCallback(async (id: string) => {
    await supabase.from('offers').update({ is_active: false }).eq('id', id);
    await refresh();
  }, [refresh]);

  const removeNeed = useCallback(async (id: string) => {
    await supabase.from('needs').update({ status: 'cancelled' }).eq('id', id);
    await refresh();
  }, [refresh]);

  const completeExchange = useCallback(async (exchangeId: string) => {
    await supabase.from('exchanges').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', exchangeId);
    await refresh();
  }, [refresh]);

  const submitFeedback = useCallback(async (exchangeId: string, toUserId: string, success: boolean, rating: number, wouldAgain: boolean, comments: string) => {
    if (!user) return;
    await supabase.from('feedback').insert({
      exchange_id: exchangeId,
      from_user_id: user.id,
      to_user_id: toUserId,
      success,
      rating,
      would_exchange_again: wouldAgain,
      comments,
    });
    await refresh();
  }, [user, refresh]);

  return {
    community,
    members,
    offers,
    needs,
    matches,
    exchanges,
    agentLogs,
    notifications,
    loading,
    refresh,
    runMatching,
    rejectParticipant,
    acceptMatch,
    rejectMatch,
    markNotificationRead,
    addOffer,
    addNeed,
    removeOffer,
    removeNeed,
    completeExchange,
    submitFeedback,
  };
}
