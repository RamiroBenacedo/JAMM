/*
  # Add delete policies for ticket management

  1. Changes
    - Add RLS policy to allow event creators to delete purchased tickets for their events
    - Add RLS policy to allow event creators to delete ticket types for their events

  2. Security
    - Policies ensure only event creators can delete tickets and ticket types
    - Maintains data integrity by allowing cascading deletes
*/

-- Policy to allow event creators to delete purchased tickets
CREATE POLICY "Event creators can delete purchased tickets"
ON purchased_tickets
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM ticket_types
    JOIN events ON events.id = ticket_types.event_id
    WHERE ticket_types.id = purchased_tickets.ticket_type_id
    AND events.creator_id = auth.uid()
  )
);

-- Policy to allow event creators to delete ticket types
CREATE POLICY "Event creators can delete ticket types"
ON ticket_types
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = ticket_types.event_id
    AND events.creator_id = auth.uid()
  )
);