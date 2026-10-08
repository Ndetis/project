/*
# Add messages table and admin role

1. New Tables
- `messages` — Direct messaging between members for coordinating exchanges
  - id, community_id, sender_id, recipient_id, body, is_read, created_at

2. Modified Tables
- `profiles` — Add `role` column (text, default 'member', values: 'member' | 'admin')

3. Security
- RLS enabled on messages.
- Users can read messages they sent or received.
- Users can insert messages they send.
- Users can update read status of messages they received.
- Users can delete their own sent messages.
- Profile role column is readable by all authenticated users (needed for admin UI).
*/

-- Add role column to profiles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE profiles ADD COLUMN role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin'));
  END IF;
END $$;

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES communities(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_own_messages" ON messages;
CREATE POLICY "read_own_messages" ON messages FOR SELECT
TO authenticated USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "insert_own_messages" ON messages;
CREATE POLICY "insert_own_messages" ON messages FOR INSERT
TO authenticated WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "update_received_messages" ON messages;
CREATE POLICY "update_received_messages" ON messages FOR UPDATE
TO authenticated USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "delete_sent_messages" ON messages;
CREATE POLICY "delete_sent_messages" ON messages FOR DELETE
TO authenticated USING (auth.uid() = sender_id);

CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_community ON messages(community_id);
