/*
  # Create events and tickets tables with automatic courtesy tickets

  1. New Tables
    - `events`
      - `id` (uuid, primary key)
      - `creator_id` (uuid, references auth.users)
      - `name` (text)
      - `description` (text)
      - `date` (date)
      - `time` (time)
      - `location` (text)
      - `max_tickets_per_user` (integer)
      - `sales_end_date` (timestamptz)
      - `created_at` (timestamptz)
    
    - `ticket_types`
      - `id` (uuid, primary key)
      - `event_id` (uuid, references events)
      - `type` (text)
      - `description` (text)
      - `price` (numeric)
      - `quantity` (integer)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for event creators to manage their events
    - Add policies for public to view events
    - Add policies for ticket type management

  3. Triggers
    - Add trigger to automatically create courtesy tickets when an event is created
*/

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  date date NOT NULL,
  time time NOT NULL,
  location text NOT NULL,
  max_tickets_per_user integer NOT NULL DEFAULT 1,
  sales_end_date timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create ticket types table
CREATE TABLE IF NOT EXISTS ticket_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  description text NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;

-- Policies for events
CREATE POLICY "Events are viewable by everyone" 
  ON events FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Users can create events" 
  ON events FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Event creators can update their events" 
  ON events FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = creator_id) 
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Event creators can delete their events" 
  ON events FOR DELETE 
  TO authenticated 
  USING (auth.uid() = creator_id);

-- Policies for ticket types
CREATE POLICY "Ticket types are viewable by everyone" 
  ON ticket_types FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Event creators can manage ticket types" 
  ON ticket_types FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = ticket_types.event_id 
      AND events.creator_id = auth.uid()
    )
  );

-- Create function to add courtesy tickets
CREATE OR REPLACE FUNCTION add_courtesy_tickets()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO ticket_types (
    event_id,
    type,
    description,
    price,
    quantity
  ) VALUES (
    NEW.id,
    'Cortesía',
    'Entrada de cortesía para invitados especiales',
    0,
    50
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically add courtesy tickets when an event is created
CREATE TRIGGER create_courtesy_tickets
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION add_courtesy_tickets();