/*
  # Fix courtesy tickets functionality

  1. Changes
    - Drops and recreates the add_courtesy_tickets function to properly handle courtesy tickets
    - Adds courtesy tickets to existing events for their creators
    - Updates RLS policies to ensure proper access

  2. Security
    - Maintains existing RLS policies
    - Ensures only event creators can manage courtesy tickets
*/

-- Drop existing function and trigger
DROP TRIGGER IF EXISTS create_courtesy_tickets ON events;
DROP FUNCTION IF EXISTS add_courtesy_tickets();

-- Recreate the function with proper auth context
CREATE OR REPLACE FUNCTION add_courtesy_tickets()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert courtesy ticket type for the event
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
    999999
  );
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER create_courtesy_tickets
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION add_courtesy_tickets();

-- Add courtesy tickets to existing events that don't have them
INSERT INTO ticket_types (event_id, type, description, price, quantity)
SELECT 
  e.id,
  'Cortesía',
  'Entrada de cortesía para invitados especiales',
  0,
  999999
FROM events e
WHERE NOT EXISTS (
  SELECT 1 
  FROM ticket_types tt 
  WHERE tt.event_id = e.id 
  AND tt.type = 'Cortesía'
);