export type Category = 'time' | 'talent' | 'treasure';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type Urgency = 'low' | 'medium' | 'high';
export type Frequency = 'one-time' | 'occasional' | 'regular';
export type NeedStatus = 'active' | 'fulfilled' | 'cancelled';
export type MatchType = 'direct' | 'multi_3' | 'multi_4';
export type MatchStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
export type ExchangeStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type SessionType = 'match' | 'search' | 'self_correct' | 'clarify';
export type UserRole = 'member' | 'admin';

export interface Community {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface Profile {
  id: string;
  community_id: string | null;
  full_name: string;
  bio: string;
  location_lat: number | null;
  location_lng: number | null;
  location_zone: string;
  max_travel_km: number;
  exchange_preferences: string[];
  trust_score: number;
  total_exchanges: number;
  onboarding_complete: boolean;
  role: UserRole;
  created_at: string;
}

export interface Offer {
  id: string;
  user_id: string;
  community_id: string | null;
  category: Category;
  title: string;
  description: string;
  skill_tags: string[];
  skill_level: SkillLevel;
  availability: string[];
  is_active: boolean;
  created_at: string;
}

export interface Need {
  id: string;
  user_id: string;
  community_id: string | null;
  category: Category;
  title: string;
  description: string;
  skill_tags: string[];
  urgency: Urgency;
  frequency: Frequency;
  status: NeedStatus;
  created_at: string;
}

export interface ExchangeChainLink {
  user_id: string;
  user_name: string;
  provides: string;
  needs: string;
  provides_category?: Category;
  needs_category?: Category;
}

export interface MatchReasoning {
  skill_fit: number;
  availability: string;
  location: string;
  exchange_fit: string;
  trust: string;
  weather: string;
  notes?: string;
}

export interface Match {
  id: string;
  community_id: string | null;
  match_type: MatchType;
  participant_ids: string[];
  chain: ExchangeChainLink[];
  confidence_score: number;
  reasoning: MatchReasoning;
  status: MatchStatus;
  expires_at: string;
  created_at: string;
}

export interface Exchange {
  id: string;
  match_id: string | null;
  community_id: string | null;
  participant_ids: string[];
  status: ExchangeStatus;
  scheduled_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Feedback {
  id: string;
  exchange_id: string;
  from_user_id: string;
  to_user_id: string;
  success: boolean;
  rating: number;
  would_exchange_again: boolean;
  comments: string;
  created_at: string;
}

export interface AgentLogEntry {
  timestamp: string;
  step: string;
  message: string;
}

export interface AgentLog {
  id: string;
  community_id: string | null;
  session_type: SessionType;
  trigger_need_id: string | null;
  trigger_offer_id: string | null;
  log_entries: AgentLogEntry[];
  result_summary: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  community_id: string | null;
  type: string;
  title: string;
  body: string;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  community_id: string | null;
  sender_id: string;
  recipient_id: string;
  body: string;
  is_read: boolean;
  created_at: string;
}
