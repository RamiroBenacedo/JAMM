/*
  # Update delete policies for ticket management

  1. Changes
    - Safely update delete policies for purchased tickets and ticket types
    - Add checks to prevent duplicate policy creation
    - Ensure policies are properly configured for event creators

  2. Security
    - Maintain existing security model
    - Ensure only event creators can delete their own data
*/

DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Event creators can delete purchased tickets" ON purchased_tickets;
    DROP POLICY IF EXISTS "Event creators can delete ticket types" ON ticket_types;

    -- Recreate the policies with updated definitions
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
END
$$;