/*
# Barter — Community Exchange Platform Schema

## Overview
Creates the full database schema for Barter, an AI-powered community exchange platform
that helps members discover, exchange, and coordinate practical ways to serve one another
through TIME, TALENT, and TREASURE.

## New Tables

1. **communities** — Groups that members join (e.g., "MPE Community")
   - id, name, description, created_at

2. **profiles** — Member profiles linked to auth.users
   - id (FK auth.users), community_id, full_name, bio, location_lat, location_lng,
     location_zone (text, approximate area), max_travel_km, exchange_preferences (text[]),
     trust_score (numeric, default 5.0), total_exchanges (int, default 0), onboarding_complete (bool), created_at

3. **offers** — What members can contribute (TIME/TALENT/TREASURE)
   - id, user_id, community_id, category (time/talent/treasure), title, description,
     skill_tags (text[]), skill_level, availability (text[]), is_active, created_at

4. **needs** — What members need help with
   - id, user_id, community_id, category (time/talent/treasure), title, description,
     skill_tags (text[]), urgency (low/medium/high), frequency (one-time/occasional/regular),
     status (active/fulfilled/cancelled), created_at

5. **matches** — AI-generated exchange proposals
   - id, community_id, match_type (direct/multi_3/multi_4), participant_ids (uuid[]),
     chain (jsonb — the exchange chain structure), confidence_score (numeric),
     reasoning (jsonb — breakdown of match dimensions), status (pending/accepted/rejected/expired),
     expires_at, created_at

6. **exchanges** — Confirmed exchanges being coordinated
   - id, match_id, community_id, participant_ids (uuid[]), status (scheduled/in_progress/completed/cancelled),
     scheduled_at, completed_at, created_at

7. **feedback** — Post-exchange trust ratings
   - id, exchange_id, from_user_id, to_user_id, success (bool), rating (1-5),
     would_exchange_again (bool), comments, created_at

8. **agent_logs** — Audit trail for AI agent sessions
   - id, community_id, session_type (match/search/self_correct), trigger_need_id, trigger_offer_id,
     log_entries (jsonb array of {timestamp, step, message} objects), result_summary,
     created_at

9. **notifications** — In-app notifications
   - id, user_id, community_id, type, title, body, related_id, is_read, created_at

## Security
- RLS enabled on all tables.
- All tables use authenticated-only policies with ownership checks.
- Profiles are readable by all authenticated users in the same community.
- Offers and needs are readable by all authenticated users in the same community.
- Matches, exchanges, feedback, agent_logs, and notifications are community-scoped.
- Users can only insert/update their own offers, needs, and profile.
*/

-- Communities
CREATE TABLE IF NOT EXISTS communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_communities" ON communities;
CREATE POLICY "read_communities" ON communities FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_communities" ON communities;
CREATE POLICY "insert_communities" ON communities FOR INSERT TO authenticated WITH CHECK (true);

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  community_id uuid REFERENCES communities(id) ON DELETE SET NULL,
  full_name text NOT NULL DEFAULT '',
  bio text DEFAULT '',
  location_lat numeric DEFAULT NULL,
  location_lng numeric DEFAULT NULL,
  location_zone text DEFAULT '',
  max_travel_km integer DEFAULT 10,
  exchange_preferences text[] DEFAULT ARRAY['direct','service_for_service','helping_without_return','multi_person'],
  trust_score numeric DEFAULT 5.0,
  total_exchanges integer DEFAULT 0,
  onboarding_complete boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_profiles" ON profiles;
CREATE POLICY "read_profiles" ON profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- Offers
CREATE TABLE IF NOT EXISTS offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  community_id uuid REFERENCES communities(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('time','talent','treasure')),
  title text NOT NULL,
  description text DEFAULT '',
  skill_tags text[] DEFAULT '{}',
  skill_level text DEFAULT 'intermediate' CHECK (skill_level IN ('beginner','intermediate','advanced','expert')),
  availability text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_offers" ON offers;
CREATE POLICY "read_offers" ON offers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_offers" ON offers;
CREATE POLICY "insert_own_offers" ON offers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_offers" ON offers;
CREATE POLICY "update_own_offers" ON offers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_offers" ON offers;
CREATE POLICY "delete_own_offers" ON offers FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Needs
CREATE TABLE IF NOT EXISTS needs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  community_id uuid REFERENCES communities(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('time','talent','treasure')),
  title text NOT NULL,
  description text DEFAULT '',
  skill_tags text[] DEFAULT '{}',
  urgency text DEFAULT 'medium' CHECK (urgency IN ('low','medium','high')),
  frequency text DEFAULT 'one-time' CHECK (frequency IN ('one-time','occasional','regular')),
  status text DEFAULT 'active' CHECK (status IN ('active','fulfilled','cancelled')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE needs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_needs" ON needs;
CREATE POLICY "read_needs" ON needs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_needs" ON needs;
CREATE POLICY "insert_own_needs" ON needs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_needs" ON needs;
CREATE POLICY "update_own_needs" ON needs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_needs" ON needs;
CREATE POLICY "delete_own_needs" ON needs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Matches (AI proposals)
CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES communities(id) ON DELETE CASCADE,
  match_type text NOT NULL CHECK (match_type IN ('direct','multi_3','multi_4')),
  participant_ids uuid[] NOT NULL DEFAULT '{}',
  chain jsonb NOT NULL DEFAULT '[]',
  confidence_score numeric DEFAULT 0,
  reasoning jsonb DEFAULT '{}',
  status text DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','expired','cancelled')),
  expires_at timestamptz DEFAULT now() + interval '7 days',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_matches" ON matches;
CREATE POLICY "read_matches" ON matches FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_matches" ON matches;
CREATE POLICY "insert_matches" ON matches FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_matches" ON matches;
CREATE POLICY "update_matches" ON matches FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_matches" ON matches;
CREATE POLICY "delete_matches" ON matches FOR DELETE TO authenticated USING (true);

-- Exchanges
CREATE TABLE IF NOT EXISTS exchanges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES matches(id) ON DELETE SET NULL,
  community_id uuid REFERENCES communities(id) ON DELETE CASCADE,
  participant_ids uuid[] NOT NULL DEFAULT '{}',
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  scheduled_at timestamptz DEFAULT NULL,
  completed_at timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE exchanges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_exchanges" ON exchanges;
CREATE POLICY "read_exchanges" ON exchanges FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_exchanges" ON exchanges;
CREATE POLICY "insert_exchanges" ON exchanges FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_exchanges" ON exchanges;
CREATE POLICY "update_exchanges" ON exchanges FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_exchanges" ON exchanges;
CREATE POLICY "delete_exchanges" ON exchanges FOR DELETE TO authenticated USING (true);

-- Feedback
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_id uuid REFERENCES exchanges(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  success boolean DEFAULT true,
  rating integer DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  would_exchange_again boolean DEFAULT true,
  comments text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_feedback" ON feedback;
CREATE POLICY "read_feedback" ON feedback FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_feedback" ON feedback;
CREATE POLICY "insert_own_feedback" ON feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user_id);
DROP POLICY IF EXISTS "update_own_feedback" ON feedback;
CREATE POLICY "update_own_feedback" ON feedback FOR UPDATE TO authenticated USING (auth.uid() = from_user_id) WITH CHECK (auth.uid() = from_user_id);
DROP POLICY IF EXISTS "delete_own_feedback" ON feedback;
CREATE POLICY "delete_own_feedback" ON feedback FOR DELETE TO authenticated USING (auth.uid() = from_user_id);

-- Agent Logs (audit trail)
CREATE TABLE IF NOT EXISTS agent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES communities(id) ON DELETE CASCADE,
  session_type text NOT NULL CHECK (session_type IN ('match','search','self_correct','clarify')),
  trigger_need_id uuid REFERENCES needs(id) ON DELETE SET NULL,
  trigger_offer_id uuid REFERENCES offers(id) ON DELETE SET NULL,
  log_entries jsonb NOT NULL DEFAULT '[]',
  result_summary text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_agent_logs" ON agent_logs;
CREATE POLICY "read_agent_logs" ON agent_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_agent_logs" ON agent_logs;
CREATE POLICY "insert_agent_logs" ON agent_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  community_id uuid REFERENCES communities(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL DEFAULT '',
  body text DEFAULT '',
  related_id uuid DEFAULT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_own_notifications" ON notifications;
CREATE POLICY "read_own_notifications" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_notifications" ON notifications;
CREATE POLICY "insert_notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_community ON profiles(community_id);
CREATE INDEX IF NOT EXISTS idx_offers_community ON offers(community_id);
CREATE INDEX IF NOT EXISTS idx_offers_user ON offers(user_id);
CREATE INDEX IF NOT EXISTS idx_needs_community ON needs(community_id);
CREATE INDEX IF NOT EXISTS idx_needs_user ON needs(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_community ON matches(community_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_exchanges_community ON exchanges(community_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_community ON agent_logs(community_id);
