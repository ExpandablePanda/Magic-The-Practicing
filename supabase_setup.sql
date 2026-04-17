-- SQL for Supabase Table Creation
-- Paste this into your Supabase SQL Editor

-- 1. Create Decks Table
CREATE TABLE IF NOT EXISTS decks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  cards JSONB DEFAULT '[]'::jsonb,
  commander JSONB DEFAULT NULL,
  maybeCards JSONB DEFAULT '[]'::jsonb,
  removedHistory JSONB DEFAULT '[]'::jsonb,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Game State Table (For sync across devices)
CREATE TABLE IF NOT EXISTS game_states (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  state JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;

-- 4. Policies
CREATE POLICY "Users can manage their own decks" 
  ON decks FOR ALL 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own game state" 
  ON game_states FOR ALL 
  USING (auth.uid() = user_id);
