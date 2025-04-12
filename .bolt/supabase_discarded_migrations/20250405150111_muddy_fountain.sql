/*
  # Add purchased tickets table

  1. New Tables
    - `purchased_tickets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `ticket_type_id` (uuid, references ticket_types)
      - `quantity` (integer)
      - `total_price` (numeric)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `purchased_tickets` table
    - Add policies for users to view and create their own tickets
*/

CREATE TABLE IF NOT EXISTS purchased_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  ticket_type_id uuid REFERENCES ticket_types NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  total_price numeric NOT NULL CHECK (total_price >= 0),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE purchased_tickets ENABLE ROW LEVEL SECURITY;

-- Policies for purchased tickets
CREATE POLICY "Users can view their own tickets"
  ON purchased_tickets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can purchase tickets"
  ON purchased_tickets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);