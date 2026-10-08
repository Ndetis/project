import type { Offer, Need, Profile, Match, ExchangeChainLink, MatchReasoning, Category } from './types';

const CATEGORY_LABELS: Record<Category, string> = {
  time: 'Time',
  talent: 'Talent',
  treasure: 'Treasure',
};

const SKILL_KEYWORDS: Record<string, string[]> = {
  'web development': ['web', 'website', 'frontend', 'react', 'html', 'css', 'programming', 'coding', 'software', 'developer'],
  'graphic design': ['design', 'logo', 'graphic', 'visual', 'branding', 'illustration', 'creative'],
  'accounting': ['accounting', 'bookkeeping', 'finance', 'tax', 'financial', 'numbers', 'ledger'],
  'cooking': ['cooking', 'cook', 'chef', 'meal', 'food', 'baking', 'kitchen', 'catering'],
  'electrical': ['electrical', 'electrician', 'wiring', 'electrical repair', 'power'],
  'plumbing': ['plumbing', 'plumber', 'pipe', 'leak', 'water repair'],
  'tutoring': ['tutoring', 'tutor', 'teaching', 'teach', 'education', 'math', 'mathematics', 'science', 'lessons'],
  'photography': ['photography', 'photo', 'camera', 'photographer', 'portrait', 'event photos'],
  'music': ['music', 'musical', 'guitar', 'piano', 'singing', 'vocal', 'instrument', 'worship'],
  'transportation': ['transportation', 'drive', 'driving', 'car', 'ride', 'pickup', 'delivery', 'transport'],
  'construction': ['construction', 'building', 'carpentry', 'woodworking', 'handyman', 'repair', 'building repair'],
  'mentoring': ['mentoring', 'mentor', 'coaching', 'guidance', 'counseling', 'life coaching'],
  'legal': ['legal', 'lawyer', 'attorney', 'law', 'contract', 'legal advice'],
  'marketing': ['marketing', 'social media', 'advertising', 'promotion', 'seo', 'content marketing'],
  'gardening': ['gardening', 'garden', 'landscaping', 'lawn', 'plants', 'yard'],
  'sewing': ['sewing', 'tailor', 'tailoring', 'clothing repair', 'alterations'],
  'moving': ['moving', 'move', 'relocation', 'furniture', 'heavy lifting', 'help moving'],
  'cleaning': ['cleaning', 'clean', ' janitorial'],
  'childcare': ['childcare', 'babysitting', 'children', 'kids', 'child care'],
  'translation': ['translation', 'translate', 'language', 'interpreter', 'interpreting'],
  'health': ['health', 'wellness', 'fitness', 'nutrition', 'exercise'],
  'writing': ['writing', 'copywriting', 'content', 'blog', 'editing', 'proofreading'],
  'mechanic': ['mechanic', 'car repair', 'auto', 'automotive', 'vehicle'],
};

function normalizeText(text: string): string {
  return text.toLowerCase().trim();
}

function extractSkillTags(text: string): string[] {
  const normalized = normalizeText(text);
  const matched: string[] = [];
  for (const [skill, keywords] of Object.entries(SKILL_KEYWORDS)) {
    if (keywords.some((kw) => normalized.includes(kw))) {
      matched.push(skill);
    }
  }
  return matched;
}

export function structureOfferInput(text: string): { title: string; skill_tags: string[]; category: Category; level: string } {
  const tags = extractSkillTags(text);
  const title = tags.length > 0 ? tags.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(', ') : text.slice(0, 60);
  const category: Category = inferCategory(text, tags);
  const level = inferLevel(text);
  return { title, skill_tags: tags, category, level };
}

export function structureNeedInput(text: string): { title: string; skill_tags: string[]; category: Category; urgency: string } {
  const tags = extractSkillTags(text);
  const title = tags.length > 0 ? tags.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(', ') : text.slice(0, 60);
  const category: Category = inferCategory(text, tags);
  const urgency = inferUrgency(text);
  return { title, skill_tags: tags, category, urgency };
}

function inferCategory(text: string, tags: string[]): Category {
  const normalized = normalizeText(text);
  if (normalized.includes('tool') || normalized.includes('equipment') || normalized.includes('book') || normalized.includes('food') || normalized.includes('furniture') || normalized.includes('clothes') || normalized.includes('material') || normalized.includes('resource')) {
    return 'treasure';
  }
  if (tags.length > 0) return 'talent';
  if (normalized.includes('time') || normalized.includes('hour') || normalized.includes('volunteer') || normalized.includes('help') || normalized.includes('visit') || normalized.includes('move')) {
    return 'time';
  }
  return 'talent';
}

function inferLevel(text: string): string {
  const normalized = normalizeText(text);
  if (normalized.includes('expert') || normalized.includes('professional') || normalized.includes('years') || normalized.includes('certified') || normalized.includes('licensed')) return 'expert';
  if (normalized.includes('advanced') || normalized.includes('experienced') || normalized.includes('senior')) return 'advanced';
  if (normalized.includes('beginner') || normalized.includes('learning') || normalized.includes('basic')) return 'beginner';
  return 'intermediate';
}

function inferUrgency(text: string): string {
  const normalized = normalizeText(text);
  if (normalized.includes('urgent') || normalized.includes('asap') || normalized.includes('immediately') || normalized.includes('emergency') || normalized.includes('now')) return 'high';
  if (normalized.includes('soon') || normalized.includes('this week') || normalized.includes('quickly')) return 'high';
  if (normalized.includes('eventually') || normalized.includes('whenever') || normalized.includes('no rush')) return 'low';
  return 'medium';
}

function skillMatchScore(needTags: string[], offerTags: string[], needTitle?: string, offerTitle?: string): number {
  // If both have tags, use tag-based matching
  if (needTags.length > 0 && offerTags.length > 0) {
    let matches = 0;
    for (const needTag of needTags) {
      for (const offerTag of offerTags) {
        if (needTag === offerTag) {
          matches += 1;
          break;
        }
        const needKw = SKILL_KEYWORDS[needTag] || [needTag];
        const offerKw = SKILL_KEYWORDS[offerTag] || [offerTag];
        if (needKw.some((k) => offerKw.includes(k))) {
          matches += 0.7;
          break;
        }
      }
    }
    return Math.min(matches / needTags.length, 1);
  }

  // Fallback: use extractSkillTags on titles as a secondary check
  const needTitleTags = needTitle ? extractSkillTags(needTitle) : [];
  const offerTitleTags = offerTitle ? extractSkillTags(offerTitle) : [];

  if (needTitleTags.length > 0 && offerTitleTags.length > 0) {
    let matches = 0;
    for (const needTag of needTitleTags) {
      for (const offerTag of offerTitleTags) {
        if (needTag === offerTag) {
          matches += 1;
          break;
        }
        const needKw = SKILL_KEYWORDS[needTag] || [needTag];
        const offerKw = SKILL_KEYWORDS[offerTag] || [offerTag];
        if (needKw.some((k) => offerKw.includes(k))) {
          matches += 0.7;
          break;
        }
      }
    }
    return Math.min(matches / needTitleTags.length, 1) * 0.8; // Slightly lower confidence for title-based match
  }

  // Last resort: direct text overlap between titles
  if (needTitle && offerTitle) {
    const needLower = needTitle.toLowerCase();
    const offerLower = offerTitle.toLowerCase();
    const needWords = needLower.split(/\s+/).filter((w) => w.length > 2);
    const offerWords = offerLower.split(/\s+/).filter((w) => w.length > 2);
    const overlap = needWords.filter((w) => offerWords.includes(w));
    if (overlap.length > 0 && needWords.length > 0) {
      return Math.min(overlap.length / needWords.length, 1) * 0.5;
    }
  }

  return 0;
}

function availabilityOverlap(needAvail: string[], offerAvail: string[]): boolean {
  if (needAvail.length === 0 || offerAvail.length === 0) return true;
  return needAvail.some((a) => offerAvail.some((b) => a.toLowerCase() === b.toLowerCase() || a.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(a.toLowerCase())));
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface MemberData {
  profile: Profile;
  offers: Offer[];
  needs: Need[];
}

export interface MatchCandidate {
  chain: ExchangeChainLink[];
  match_type: 'direct' | 'multi_3' | 'multi_4';
  confidence_score: number;
  reasoning: MatchReasoning;
  participant_ids: string[];
}

export interface AgentRunResult {
  candidates: MatchCandidate[];
  logs: { timestamp: string; step: string; message: string }[];
  result_summary: string;
}

function nowTimestamp(): string {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

function buildReasoning(
  skillScore: number,
  availOk: boolean,
  distOk: boolean,
  exchangeOk: boolean,
  trustScore: number,
  chainLength: number
): MatchReasoning {
  return {
    skill_fit: Math.round(skillScore * 100),
    availability: availOk ? 'Compatible' : 'Mismatch',
    location: distOk ? 'Within range' : 'Too far',
    exchange_fit: exchangeOk ? (chainLength === 1 ? 'Direct' : chainLength === 2 ? 'Strong' : 'Good') : 'Weak',
    trust: trustScore >= 4.5 ? 'Excellent' : trustScore >= 4 ? 'Good' : trustScore >= 3 ? 'Fair' : 'New member',
    weather: 'Suitable',
  };
}

function computeConfidence(
  skillScore: number,
  availOk: boolean,
  distOk: boolean,
  exchangeOk: boolean,
  trustScore: number,
  urgencyWeight: number
): number {
  const skill = skillScore * 0.30;
  const avail = (availOk ? 1 : 0) * 0.15;
  const dist = (distOk ? 1 : 0) * 0.10;
  const exchange = (exchangeOk ? 1 : 0) * 0.10;
  const trust = Math.min(trustScore / 5, 1) * 0.05;
  const urgency = urgencyWeight * 0.05;
  const chainPenalty = 0.05;
  return Math.round((skill + avail + dist + exchange + trust + urgency) * 100);
}

export function runMatchingAgent(
  triggerNeed: Need,
  allMembers: MemberData[],
  triggerUserProfile: Profile
): AgentRunResult {
  const logs: { timestamp: string; step: string; message: string }[] = [];
  const addLog = (step: string, message: string) => {
    logs.push({ timestamp: nowTimestamp(), step, message });
  };

  addLog('need_received', `New need received: "${triggerNeed.title}"`);
  addLog('need_classified', `Need classified as ${triggerNeed.category}. Tags: ${triggerNeed.skill_tags.join(', ') || 'none'}`);

  // Build the community graph
  const otherMembers = allMembers.filter((m) => m.profile.id !== triggerNeed.user_id);
  addLog('search_community', `Searching ${otherMembers.length} community members for matching offers`);

  // Phase 1: Find direct matches
  const directCandidates: MatchCandidate[] = [];
  addLog('phase_1', 'Phase 1: Searching for direct matches');

  for (const member of otherMembers) {
    for (const offer of member.offers) {
      if (!offer.is_active) continue;
      const score = skillMatchScore(triggerNeed.skill_tags, offer.skill_tags);
      if (score < 0.3) continue;

      addLog('candidate_found', `Candidate: ${member.profile.full_name} — ${offer.title} (skill fit: ${Math.round(score * 100)}%)`);

      const availOk = availabilityOverlap(triggerUserProfile.exchange_preferences, offer.availability);
      const dist = triggerUserProfile.location_lat && member.profile.location_lat
        ? distanceKm(triggerUserProfile.location_lat, triggerUserProfile.location_lng!, member.profile.location_lat, member.profile.location_lng!)
        : 0;
      const distOk = dist <= (triggerUserProfile.max_travel_km || 10);
      const exchangeOk = member.profile.exchange_preferences.some((p) => triggerUserProfile.exchange_preferences.includes(p));
      const confidence = computeConfidence(score, availOk, distOk, exchangeOk, member.profile.trust_score, triggerNeed.urgency === 'high' ? 1 : 0.5);

      if (!availOk) {
        addLog('candidate_rejected', `${member.profile.full_name} rejected: availability mismatch`);
        continue;
      }
      if (!distOk) {
        addLog('candidate_rejected', `${member.profile.full_name} rejected: too far away (${dist.toFixed(1)} km)`);
        continue;
      }

      // Check if this member also has a need that the trigger user can fulfill
      let reciprocityScore = 0;
      let memberNeed: Need | null = null;
      let triggerOffer: Offer | null = null;

      for (const need of member.needs) {
        if (need.status !== 'active') continue;
        for (const toffer of allMembers.find((m) => m.profile.id === triggerNeed.user_id)?.offers || []) {
          if (!toffer.is_active) continue;
          const rScore = skillMatchScore(need.skill_tags, toffer.skill_tags);
          if (rScore > reciprocityScore) {
            reciprocityScore = rScore;
            memberNeed = need;
            triggerOffer = toffer;
          }
        }
      }

      if (memberNeed && triggerOffer) {
        addLog('reciprocity_check', `${member.profile.full_name} needs "${memberNeed.title}" — you can provide "${triggerOffer.title}"`);
      }

      const chain: ExchangeChainLink[] = [
        { user_id: triggerNeed.user_id, user_name: triggerUserProfile.full_name, provides: triggerOffer?.title || 'Help', needs: triggerNeed.title },
        { user_id: member.profile.id, user_name: member.profile.full_name, provides: offer.title, needs: memberNeed?.title || 'General help' },
      ];

      const reasoning = buildReasoning(score, availOk, distOk, exchangeOk, member.profile.trust_score, 1);
      directCandidates.push({
        chain,
        match_type: 'direct',
        confidence_score: confidence,
        reasoning,
        participant_ids: [triggerNeed.user_id, member.profile.id],
      });
      addLog('match_found', `Direct match found with ${member.profile.full_name} (confidence: ${confidence}%)`);
    }
  }

  // Phase 2: Multi-party exchange (3-way and 4-way)
  addLog('phase_2', 'Phase 2: Searching for multi-party exchanges');

  const multiCandidates: MatchCandidate[] = [];

  // 3-way: A needs X, B provides X and needs Y, C provides Y and needs something A provides
  for (const memberB of otherMembers) {
    for (const offerB of memberB.offers) {
      if (!offerB.is_active) continue;
      const scoreAB = skillMatchScore(triggerNeed.skill_tags, offerB.skill_tags);
      if (scoreAB < 0.3) continue;

      // B has a need
      for (const needB of memberB.needs) {
        if (needB.status !== 'active') continue;

        // Find C who can fulfill B's need
        const membersC = otherMembers.filter((m) => m.profile.id !== memberB.profile.id);
        for (const memberC of membersC) {
          for (const offerC of memberC.offers) {
            if (!offerC.is_active) continue;
            const scoreBC = skillMatchScore(needB.skill_tags, offerC.skill_tags);
            if (scoreBC < 0.3) continue;

            // C has a need that A (trigger user) can fulfill
            for (const needC of memberC.needs) {
              if (needC.status !== 'active') continue;
              const triggerMember = allMembers.find((m) => m.profile.id === triggerNeed.user_id);
              if (!triggerMember) continue;

              for (const offerA of triggerMember.offers) {
                if (!offerA.is_active) continue;
                const scoreCA = skillMatchScore(needC.skill_tags, offerA.skill_tags);
                if (scoreCA < 0.3) continue;

                // We have a 3-way exchange!
                addLog('multi_3_found', `3-way exchange: ${triggerUserProfile.full_name} -> ${memberB.profile.full_name} -> ${memberC.profile.full_name} -> ${triggerUserProfile.full_name}`);

                const avgSkill = (scoreAB + scoreBC + scoreCA) / 3;
                const availOk = true;
                const distOk = true;
                const exchangeOk = memberB.profile.exchange_preferences.includes('multi_person') && memberC.profile.exchange_preferences.includes('multi_person') && triggerUserProfile.exchange_preferences.includes('multi_person');
                const avgTrust = (memberB.profile.trust_score + memberC.profile.trust_score) / 2;
                const confidence = computeConfidence(avgSkill, availOk, distOk, exchangeOk, avgTrust, triggerNeed.urgency === 'high' ? 1 : 0.5) - 5;

                const chain: ExchangeChainLink[] = [
                  { user_id: triggerNeed.user_id, user_name: triggerUserProfile.full_name, provides: offerA.title, needs: triggerNeed.title },
                  { user_id: memberB.profile.id, user_name: memberB.profile.full_name, provides: offerB.title, needs: needB.title },
                  { user_id: memberC.profile.id, user_name: memberC.profile.full_name, provides: offerC.title, needs: needC.title },
                ];

                const reasoning = buildReasoning(avgSkill, availOk, distOk, exchangeOk, avgTrust, 2);
                multiCandidates.push({
                  chain,
                  match_type: 'multi_3',
                  confidence_score: Math.max(confidence, 50),
                  reasoning,
                  participant_ids: [triggerNeed.user_id, memberB.profile.id, memberC.profile.id],
                });
              }
            }
          }
        }
      }
    }
  }

  // 4-way: A needs X, B provides X needs Y, C provides Y needs Z, D provides Z needs something A provides
  if (multiCandidates.filter((c) => c.match_type === 'multi_3').length === 0) {
    addLog('phase_3', 'No 3-way match found. Searching for 4-way exchanges');
    for (const memberB of otherMembers) {
      for (const offerB of memberB.offers) {
        if (!offerB.is_active) continue;
        const scoreAB = skillMatchScore(triggerNeed.skill_tags, offerB.skill_tags);
        if (scoreAB < 0.3) continue;
        for (const needB of memberB.needs) {
          if (needB.status !== 'active') continue;
          for (const memberC of otherMembers.filter((m) => m.profile.id !== memberB.profile.id)) {
            for (const offerC of memberC.offers) {
              if (!offerC.is_active) continue;
              const scoreBC = skillMatchScore(needB.skill_tags, offerC.skill_tags);
              if (scoreBC < 0.3) continue;
              for (const needC of memberC.needs) {
                if (needC.status !== 'active') continue;
                for (const memberD of otherMembers.filter((m) => m.profile.id !== memberB.profile.id && m.profile.id !== memberC.profile.id)) {
                  for (const offerD of memberD.offers) {
                    if (!offerD.is_active) continue;
                    const scoreCD = skillMatchScore(needC.skill_tags, offerD.skill_tags);
                    if (scoreCD < 0.3) continue;
                    for (const needD of memberD.needs) {
                      if (needD.status !== 'active') continue;
                      const triggerMember = allMembers.find((m) => m.profile.id === triggerNeed.user_id);
                      if (!triggerMember) continue;
                      for (const offerA of triggerMember.offers) {
                        if (!offerA.is_active) continue;
                        const scoreDA = skillMatchScore(needD.skill_tags, offerA.skill_tags);
                        if (scoreDA < 0.3) continue;

                        addLog('multi_4_found', `4-way exchange discovered: ${triggerUserProfile.full_name} -> ${memberB.profile.full_name} -> ${memberC.profile.full_name} -> ${memberD.profile.full_name} -> ${triggerUserProfile.full_name}`);

                        const avgSkill = (scoreAB + scoreBC + scoreCD + scoreDA) / 4;
                        const avgTrust = (memberB.profile.trust_score + memberC.profile.trust_score + memberD.profile.trust_score) / 3;
                        const exchangeOk = [memberB, memberC, memberD].every((m) => m.profile.exchange_preferences.includes('multi_person'));
                        const confidence = computeConfidence(avgSkill, true, true, exchangeOk, avgTrust, triggerNeed.urgency === 'high' ? 1 : 0.5) - 10;

                        const chain: ExchangeChainLink[] = [
                          { user_id: triggerNeed.user_id, user_name: triggerUserProfile.full_name, provides: offerA.title, needs: triggerNeed.title },
                          { user_id: memberB.profile.id, user_name: memberB.profile.full_name, provides: offerB.title, needs: needB.title },
                          { user_id: memberC.profile.id, user_name: memberC.profile.full_name, provides: offerC.title, needs: needC.title },
                          { user_id: memberD.profile.id, user_name: memberD.profile.full_name, provides: offerD.title, needs: needD.title },
                        ];

                        const reasoning = buildReasoning(avgSkill, true, true, exchangeOk, avgTrust, 3);
                        multiCandidates.push({
                          chain,
                          match_type: 'multi_4',
                          confidence_score: Math.max(confidence, 45),
                          reasoning,
                          participant_ids: [triggerNeed.user_id, memberB.profile.id, memberC.profile.id, memberD.profile.id],
                        });
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  // Sort all candidates by confidence
  const allCandidates = [...directCandidates, ...multiCandidates].sort((a, b) => b.confidence_score - a.confidence_score);

  if (allCandidates.length === 0) {
    addLog('no_match', 'No viable exchange found. The need has been recorded for future matching.');
    return { candidates: [], logs, result_summary: 'No viable exchange found at this time.' };
  }

  addLog('ranking', `Ranked ${allCandidates.length} candidates. Best: ${allCandidates[0].match_type} at ${allCandidates[0].confidence_score}% confidence`);
  addLog('awaiting_confirmation', 'Proposal generated. Awaiting human confirmation.');

  const best = allCandidates[0];
  const summary = best.match_type === 'direct'
    ? `Direct match found with ${best.chain[1].user_name} at ${best.confidence_score}% confidence.`
    : `${best.match_type === 'multi_3' ? '3-person' : '4-person'} exchange discovered at ${best.confidence_score}% confidence.`;

  return { candidates: allCandidates, logs, result_summary: summary };
}

export function selfCorrectAndRetry(
  originalResult: AgentRunResult,
  rejectedParticipantId: string,
  allMembers: MemberData[],
  triggerNeed: Need,
  triggerUserProfile: Profile
): AgentRunResult {
  const logs = [...originalResult.logs];
  const addLog = (step: string, message: string) => {
    logs.push({ timestamp: nowTimestamp(), step, message });
  };

  addLog('self_correction', `Participant ${rejectedParticipantId} rejected/became unavailable. Initiating self-correction.`);
  addLog('remove_candidate', 'Removing rejected candidate from pool.');

  // Filter out candidates that include the rejected participant
  const remaining = originalResult.candidates.filter(
    (c) => !c.participant_ids.includes(rejectedParticipantId)
  );

  if (remaining.length > 0) {
    addLog('alternative_found', `Found ${remaining.length} alternative candidates without the rejected participant.`);
    addLog('alternative_selected', `Best alternative: ${remaining[0].match_type} at ${remaining[0].confidence_score}% confidence.`);
    return {
      candidates: remaining,
      logs,
      result_summary: `Self-correction successful. Found alternative exchange at ${remaining[0].confidence_score}% confidence.`,
    };
  }

  // If no remaining candidates, try re-running with filtered members
  addLog('re_search', 'No alternatives in existing candidates. Re-searching community with reduced pool.');
  const filteredMembers = allMembers.filter((m) => m.profile.id !== rejectedParticipantId);
  const newResult = runMatchingAgent(triggerNeed, filteredMembers, triggerUserProfile);

  if (newResult.candidates.length > 0) {
    addLog('re_search_success', `Found ${newResult.candidates.length} new candidates after re-search.`);
    return {
      candidates: newResult.candidates,
      logs: [...logs, ...newResult.logs],
      result_summary: `Self-correction successful. Found new exchange at ${newResult.candidates[0].confidence_score}% confidence.`,
    };
  }

  addLog('no_safe_match', 'No safe equivalent match exists after self-correction.');
  return {
    candidates: [],
    logs,
    result_summary: 'No safe equivalent match exists after the participant became unavailable.',
  };
}

export { CATEGORY_LABELS, extractSkillTags, distanceKm, availabilityOverlap };
