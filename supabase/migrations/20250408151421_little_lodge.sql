/*
  # Add UTM tracking functionality

  1. New Tables
    - `event_visits`
      - `id` (uuid, primary key)
      - `event_id` (uuid, references events)
      - `utm_source` (text)
      - `utm_medium` (text)
      - `utm_campaign` (text)
      - `utm_term` (text)
      - `utm_content` (text)
      - `visited_at` (timestamp)
      - `referrer` (text)

  2. Security
    - Enable RLS on event_visits table
    - Add policy for event creators to view their event visits
*/

-- Create event_visits table
CREATE TABLE IF NOT EXISTS event_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  visited_at TIMESTAMPTZ DEFAULT now(),
  referrer TEXT
);

-- Add foreign key separately to avoid duplicate constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'event_visits_event_id_fkey'
  ) THEN
    ALTER TABLE event_visits
    ADD CONSTRAINT event_visits_event_id_fkey
    FOREIGN KEY (event_id)
    REFERENCES events(id)
    ON DELETE CASCADE;
  END IF;
END
$$;

-- Enable RLS
ALTER TABLE event_visits ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Event creators can view their event visits"
ON event_visits
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = event_visits.event_id
    AND events.creator_id = auth.uid()
  )
);

CREATE POLICY "Anyone can insert event visits"
ON event_visits
FOR INSERT
TO public
WITH CHECK (true);