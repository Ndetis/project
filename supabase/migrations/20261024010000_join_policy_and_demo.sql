/*
# Community join policy and Harbour Neighbours demo

1. Communities gain `join_policy`:
   - `open` — a person joins immediately
   - `approval` — a coordinator must approve the request

2. Profiles gain `membership_status`: `pending`, `active`, or `rejected`.
   A member cannot approve their own request.

3. Demo community "Harbour Neighbours" with a coordinator, five active members,
   one person waiting for approval, offers, needs, a proposed match, and a
   completed exchange. Password for every demo account is `password123`.
*/

ALTER TABLE communities
  ADD COLUMN IF NOT EXISTS join_policy text NOT NULL DEFAULT 'open';

DO $$ BEGIN
  ALTER TABLE communities
    ADD CONSTRAINT communities_join_policy_check
    CHECK (join_policy IN ('open', 'approval'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS membership_status text NOT NULL DEFAULT 'active';

DO $$ BEGIN
  ALTER TABLE profiles
    ADD CONSTRAINT profiles_membership_status_check
    CHECK (membership_status IN ('pending', 'active', 'rejected'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_membership ON profiles(community_id, membership_status);

-- Members cannot switch their own pending request to active.
CREATE OR REPLACE FUNCTION public.enforce_join_policy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  policy text;
BEGIN
  IF NEW.community_id IS DISTINCT FROM OLD.community_id AND NEW.community_id IS NOT NULL THEN
    SELECT join_policy INTO policy FROM communities WHERE id = NEW.community_id;
    IF policy = 'approval' AND NEW.id = auth.uid() AND COALESCE(NEW.role, 'member') <> 'admin' THEN
      NEW.membership_status := 'pending';
    ELSIF policy = 'open' AND NEW.id = auth.uid() THEN
      NEW.membership_status := 'active';
    END IF;
  END IF;

  IF OLD.membership_status = 'pending'
     AND NEW.membership_status IS DISTINCT FROM 'pending'
     AND NEW.community_id IS NOT DISTINCT FROM OLD.community_id
     AND NEW.id = auth.uid()
     AND COALESCE(NEW.role, 'member') <> 'admin' THEN
    NEW.membership_status := 'pending';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_join_policy ON profiles;
CREATE TRIGGER enforce_join_policy
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_join_policy();

DROP POLICY IF EXISTS "admin_update_community" ON communities;
CREATE POLICY "admin_update_community" ON communities
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.community_id = communities.id
        AND p.membership_status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.community_id = communities.id
        AND p.membership_status = 'active'
    )
  );

CREATE OR REPLACE FUNCTION public.demo_uuid(seed text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (
    substr(md5(seed), 1, 8) || '-' ||
    substr(md5(seed), 9, 4) || '-' ||
    '4' || substr(md5(seed), 14, 3) || '-' ||
    '8' || substr(md5(seed), 18, 3) || '-' ||
    substr(md5(seed), 21, 12)
  )::uuid;
$$;

CREATE OR REPLACE FUNCTION public.ensure_demo_user(
  p_email text,
  p_full_name text,
  p_role text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
  existing uuid;
  new_id uuid;
  password_hash text;
  user_values jsonb;
  identity_values jsonb;
  col text;
  user_cols text[] := ARRAY[]::text[];
  user_vals text[] := ARRAY[]::text[];
  identity_cols text[] := ARRAY[]::text[];
  identity_vals text[] := ARRAY[]::text[];
BEGIN
  SELECT id INTO existing FROM auth.users WHERE lower(email) = lower(p_email);
  IF existing IS NOT NULL THEN
    RETURN existing;
  END IF;

  new_id := public.demo_uuid(p_email);
  password_hash := crypt('password123', gen_salt('bf'));

  user_values := jsonb_build_object(
    'instance_id', '00000000-0000-0000-0000-000000000000',
    'id', new_id,
    'aud', 'authenticated',
    'role', 'authenticated',
    'email', p_email,
    'encrypted_password', password_hash,
    'email_confirmed_at', now(),
    'recovery_sent_at', now(),
    'last_sign_in_at', now(),
    'raw_app_meta_data', jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    'raw_user_meta_data', jsonb_build_object('full_name', p_full_name, 'role', p_role),
    'created_at', now(),
    'updated_at', now(),
    'confirmation_token', '',
    'email_change', '',
    'email_change_token_new', '',
    'email_change_token_current', '',
    'email_change_confirm_status', 0,
    'recovery_token', '',
    'phone_change', '',
    'phone_change_token', '',
    'reauthentication_token', '',
    'is_sso_user', false,
    'is_anonymous', false,
    'is_super_admin', false
  );

  FOR col IN
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'auth'
      AND table_name = 'users'
      AND user_values ? column_name
  LOOP
    user_cols := array_append(user_cols, quote_ident(col));
    user_vals := array_append(user_vals, quote_nullable(user_values ->> col));
  END LOOP;

  EXECUTE format(
    'INSERT INTO auth.users (%s) VALUES (%s)',
    array_to_string(user_cols, ', '),
    array_to_string(user_vals, ', ')
  );

  identity_values := jsonb_build_object(
    'id', gen_random_uuid(),
    'user_id', new_id,
    'provider_id', new_id::text,
    'identity_data', jsonb_build_object('sub', new_id::text, 'email', p_email, 'email_verified', true),
    'provider', 'email',
    'last_sign_in_at', now(),
    'created_at', now(),
    'updated_at', now()
  );

  FOR col IN
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'auth'
      AND table_name = 'identities'
      AND identity_values ? column_name
  LOOP
    identity_cols := array_append(identity_cols, quote_ident(col));
    identity_vals := array_append(identity_vals, quote_nullable(identity_values ->> col));
  END LOOP;

  EXECUTE format(
    'INSERT INTO auth.identities (%s) VALUES (%s)',
    array_to_string(identity_cols, ', '),
    array_to_string(identity_vals, ', ')
  );

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_demo_user(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.demo_uuid(text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.review_join_request(target_user uuid, decision text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_community uuid;
  person_name text;
BEGIN
  IF decision NOT IN ('active', 'rejected') THEN
    RAISE EXCEPTION 'Invalid decision';
  END IF;

  SELECT community_id INTO admin_community
  FROM profiles
  WHERE id = auth.uid()
    AND role = 'admin'
    AND membership_status = 'active';

  IF admin_community IS NULL THEN
    RAISE EXCEPTION 'Only a community coordinator can review requests';
  END IF;

  SELECT full_name INTO person_name
  FROM profiles
  WHERE id = target_user
    AND community_id = admin_community
    AND membership_status = 'pending';

  IF person_name IS NULL THEN
    RAISE EXCEPTION 'This request is no longer pending';
  END IF;

  UPDATE profiles
  SET membership_status = decision,
      community_id = CASE WHEN decision = 'rejected' THEN NULL ELSE community_id END
  WHERE id = target_user;

  INSERT INTO notifications (user_id, community_id, type, title, body)
  VALUES (
    target_user,
    CASE WHEN decision = 'rejected' THEN NULL ELSE admin_community END,
    'join_decision',
    CASE WHEN decision = 'active' THEN 'You can join the community' ELSE 'Your request was declined' END,
    CASE
      WHEN decision = 'active' THEN 'A coordinator approved your request. Sign in again to finish setting up your profile.'
      ELSE 'A coordinator declined your request. You can ask to join a different community.'
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.review_join_request(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_join_request(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.seed_community_demo(p_community uuid, p_fixed_demo boolean DEFAULT false)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
  person jsonb;
  people jsonb;
  email text;
  user_id uuid;
  suffix text;
  amara_id uuid;
  jonas_id uuid;
  match_id uuid;
  exchange_id uuid;
  amara_need uuid;
  jonas_offer uuid;
BEGIN
  IF coalesce(auth.role(), '') IN ('anon', 'authenticated') THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
        AND community_id = p_community
        AND membership_status = 'active'
    ) THEN
      RAISE EXCEPTION 'Only the community coordinator can load sample members';
    END IF;
  ELSIF current_user NOT IN ('postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM communities WHERE id = p_community) THEN
    RAISE EXCEPTION 'Community not found';
  END IF;

  suffix := replace(p_community::text, '-', '');

  people := '[
    {"key":"amara","name":"Amara Diallo","bio":"Designs logos and posters for neighbors.","zone":"Harbour East","lat":40.7138,"lng":-74.0042,"trust":4.8,"status":"active","offer_cat":"talent","offer_title":"Graphic design","offer_desc":"I design logos, posters, and simple brand work.","offer_tags":["graphic design"],"offer_level":"expert","offer_avail":["Weekends","Evenings"],"need_cat":"time","need_title":"Gardening","need_desc":"I need help getting my small garden through the season.","need_tags":["gardening"],"need_urgency":"medium"},
    {"key":"jonas","name":"Jonas Keller","bio":"Looks after yards and shared courtyards.","zone":"Dockside","lat":40.7094,"lng":-74.0118,"trust":4.6,"status":"active","offer_cat":"time","offer_title":"Gardening","offer_desc":"I can help with gardens, lawns, and courtyard plants.","offer_tags":["gardening"],"offer_level":"advanced","offer_avail":["Weekends","Mornings"],"need_cat":"talent","need_title":"Accounting","need_desc":"I need help sorting receipts and simple bookkeeping.","need_tags":["accounting"],"need_urgency":"low"},
    {"key":"priya","name":"Priya Shah","bio":"Keeps books for small neighborhood projects.","zone":"Market Row","lat":40.7162,"lng":-74.0088,"trust":4.9,"status":"active","offer_cat":"talent","offer_title":"Accounting","offer_desc":"I can help with bookkeeping, receipts, and simple tax questions.","offer_tags":["accounting"],"offer_level":"expert","offer_avail":["Weekdays","Evenings"],"need_cat":"talent","need_title":"Graphic design","need_desc":"I need a logo for a weekend workshop.","need_tags":["graphic design"],"need_urgency":"medium"},
    {"key":"luis","name":"Luis Ortega","bio":"Builds small websites for local groups.","zone":"Harbour East","lat":40.7111,"lng":-74.0025,"trust":4.4,"status":"active","offer_cat":"talent","offer_title":"Web development","offer_desc":"I build simple websites and can teach the basics.","offer_tags":["web development"],"offer_level":"advanced","offer_avail":["Evenings","Weekends"],"need_cat":"talent","need_title":"Mechanic","need_desc":"My car needs a basic repair before winter.","need_tags":["mechanic"],"need_urgency":"high"},
    {"key":"elena","name":"Elena Costa","bio":"Fixes bikes and cars from a shared garage.","zone":"Dockside","lat":40.7082,"lng":-74.0144,"trust":4.7,"status":"active","offer_cat":"talent","offer_title":"Mechanic","offer_desc":"I repair bikes and can handle basic car repair.","offer_tags":["mechanic"],"offer_level":"expert","offer_avail":["Weekdays","Afternoons"],"need_cat":"talent","need_title":"Web development","need_desc":"I need a simple page where neighbors can book the garage.","need_tags":["web development"],"need_urgency":"low"},
    {"key":"samir","name":"Samir Adeyemi","bio":"Asked to join. Can tutor math in the evenings.","zone":"Market Row","lat":40.7175,"lng":-74.0061,"trust":5.0,"status":"pending"}
  ]'::jsonb;

  email := CASE
    WHEN p_fixed_demo THEN 'amara@harbour.demo'
    ELSE 'amara.' || suffix || '@samples.barter'
  END;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = email) THEN
    RETURN 'Sample members are already in this community.';
  END IF;

  FOR person IN SELECT value FROM jsonb_array_elements(people)
  LOOP
    email := CASE
      WHEN p_fixed_demo THEN person->>'key' || '@harbour.demo'
      ELSE person->>'key' || '.' || suffix || '@samples.barter'
    END;

    user_id := public.ensure_demo_user(email, person->>'name', 'member');

    INSERT INTO profiles (
      id, community_id, full_name, bio, location_lat, location_lng, location_zone,
      max_travel_km, trust_score, onboarding_complete, role, membership_status
    ) VALUES (
      user_id,
      p_community,
      person->>'name',
      person->>'bio',
      (person->>'lat')::numeric,
      (person->>'lng')::numeric,
      person->>'zone',
      10,
      (person->>'trust')::numeric,
      true,
      'member',
      person->>'status'
    )
    ON CONFLICT (id) DO NOTHING;

    IF person->>'status' = 'active' AND person ? 'offer_title' THEN
      IF NOT EXISTS (SELECT 1 FROM offers WHERE user_id = user_id AND title = person->>'offer_title') THEN
        INSERT INTO offers (
          user_id, community_id, category, title, description, skill_tags, skill_level, availability, is_active
        ) VALUES (
          user_id,
          p_community,
          person->>'offer_cat',
          person->>'offer_title',
          person->>'offer_desc',
          ARRAY(SELECT jsonb_array_elements_text(person->'offer_tags')),
          person->>'offer_level',
          ARRAY(SELECT jsonb_array_elements_text(person->'offer_avail')),
          true
        );
      END IF;

      IF NOT EXISTS (SELECT 1 FROM needs WHERE user_id = user_id AND title = person->>'need_title') THEN
        INSERT INTO needs (
          user_id, community_id, category, title, description, skill_tags, urgency, frequency, status
        ) VALUES (
          user_id,
          p_community,
          person->>'need_cat',
          person->>'need_title',
          person->>'need_desc',
          ARRAY(SELECT jsonb_array_elements_text(person->'need_tags')),
          person->>'need_urgency',
          'occasional',
          'active'
        );
      END IF;
    END IF;
  END LOOP;

  SELECT id INTO amara_id FROM auth.users WHERE email = CASE WHEN p_fixed_demo THEN 'amara@harbour.demo' ELSE 'amara.' || suffix || '@samples.barter' END;
  SELECT id INTO jonas_id FROM auth.users WHERE email = CASE WHEN p_fixed_demo THEN 'jonas@harbour.demo' ELSE 'jonas.' || suffix || '@samples.barter' END;
  SELECT id INTO amara_need FROM needs WHERE user_id = amara_id AND title = 'Gardening' LIMIT 1;
  SELECT id INTO jonas_offer FROM offers WHERE user_id = jonas_id AND title = 'Gardening' LIMIT 1;

  match_id := public.demo_uuid(p_community::text || ':direct-match');
  IF NOT EXISTS (SELECT 1 FROM matches WHERE id = match_id) THEN
    INSERT INTO matches (
      id, community_id, match_type, participant_ids, chain, confidence_score, reasoning, status
    ) VALUES (
      match_id,
      p_community,
      'direct',
      ARRAY[amara_id, jonas_id],
      jsonb_build_array(
        jsonb_build_object('user_id', amara_id, 'user_name', 'Amara Diallo', 'provides', 'Graphic design', 'needs', 'Gardening', 'provides_category', 'talent', 'needs_category', 'time'),
        jsonb_build_object('user_id', jonas_id, 'user_name', 'Jonas Keller', 'provides', 'Gardening', 'needs', 'Accounting', 'provides_category', 'time', 'needs_category', 'talent')
      ),
      86,
      jsonb_build_object(
        'skill_fit', 0.92,
        'availability', 'Weekends overlap',
        'location', 'Both are within the neighbourhood',
        'exchange_fit', 'Direct exchange',
        'trust', 'Both members have a strong record',
        'weather', 'Suitable for outdoor gardening',
        'notes', 'Jonas can tend Amara''s garden. Amara can design for someone Jonas helps.'
      ),
      'pending'
    );
  END IF;

  exchange_id := public.demo_uuid(p_community::text || ':completed-exchange');
  IF NOT EXISTS (SELECT 1 FROM exchanges WHERE id = exchange_id) THEN
    INSERT INTO exchanges (
      id, community_id, participant_ids, status, scheduled_at, completed_at
    ) VALUES (
      exchange_id,
      p_community,
      ARRAY[
        (SELECT id FROM auth.users WHERE email = CASE WHEN p_fixed_demo THEN 'priya@harbour.demo' ELSE 'priya.' || suffix || '@samples.barter' END),
        (SELECT id FROM auth.users WHERE email = CASE WHEN p_fixed_demo THEN 'elena@harbour.demo' ELSE 'elena.' || suffix || '@samples.barter' END)
      ],
      'completed',
      now() - interval '12 days',
      now() - interval '10 days'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM agent_logs WHERE community_id = p_community AND result_summary = 'Sample session: gardening help for Amara Diallo'
  ) THEN
    INSERT INTO agent_logs (community_id, session_type, trigger_need_id, trigger_offer_id, log_entries, result_summary)
    VALUES (
      p_community,
      'match',
      amara_need,
      jonas_offer,
      jsonb_build_array(
        jsonb_build_object('timestamp', now(), 'step', 'need_classified', 'message', 'Need classified as time. Tags: gardening'),
        jsonb_build_object('timestamp', now(), 'step', 'match_found', 'message', 'Direct match found with Jonas Keller (confidence: 86%)')
      ),
      'Sample session: gardening help for Amara Diallo'
    );
  END IF;

  INSERT INTO notifications (user_id, community_id, type, title, body)
  SELECT p.id, p_community, 'join_request', 'Samir Adeyemi wants to join',
         'Samir asked to join and can tutor math in the evenings.'
  FROM profiles p
  WHERE p.community_id = p_community
    AND p.role = 'admin'
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.user_id = p.id AND n.type = 'join_request' AND n.community_id = p_community
    );

  RETURN 'Sample members added. Their password is password123.';
END;
$$;

REVOKE ALL ON FUNCTION public.seed_community_demo(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seed_community_demo(uuid, boolean) TO authenticated;

-- Harbour Neighbours, the built-in demo community.
INSERT INTO communities (id, name, description, join_policy)
VALUES (
  'c0ffee00-0000-4000-8000-000000000001',
  'Harbour Neighbours',
  'A waterfront neighborhood where neighbors exchange time, skills, and tools. New members wait for a coordinator to approve them.',
  'approval'
)
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  coordinator_id uuid;
  seed_result text;
BEGIN
  BEGIN
  coordinator_id := public.ensure_demo_user('coordinator@harbour.demo', 'Nia Mensah', 'admin');

  INSERT INTO profiles (
    id, community_id, full_name, bio, location_lat, location_lng, location_zone,
    max_travel_km, trust_score, onboarding_complete, role, membership_status
  ) VALUES (
    coordinator_id,
    'c0ffee00-0000-4000-8000-000000000001',
    'Nia Mensah',
    'Coordinates Harbour Neighbours and helps new members make a first exchange.',
    40.7148,
    -74.0072,
    'Harbour East',
    10,
    5.0,
    true,
    'admin',
    'active'
  )
  ON CONFLICT (id) DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM offers WHERE user_id = coordinator_id AND title = 'Mentoring') THEN
    INSERT INTO offers (
      user_id, community_id, category, title, description, skill_tags, skill_level, availability, is_active
    ) VALUES (
      coordinator_id,
      'c0ffee00-0000-4000-8000-000000000001',
      'time',
      'Mentoring',
      'I mentor new members and help them find a first exchange.',
      ARRAY['mentoring'],
      'advanced',
      ARRAY['Weekdays', 'Evenings'],
      true
    );
  END IF;

  seed_result := public.seed_community_demo('c0ffee00-0000-4000-8000-000000000001', true);
  RAISE NOTICE '%', seed_result;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Demo accounts were not created: %', SQLERRM;
  END;
END $$;

NOTIFY pgrst, 'reload schema';
