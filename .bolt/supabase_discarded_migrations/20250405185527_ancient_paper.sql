/*
  # Add QR code support for tickets

  1. Changes
    - Add qr_code column to purchased_tickets table
    - Add unique constraint to ensure each QR code is unique
    - Add function to generate unique QR codes
    - Update purchase_tickets function to generate QR codes

  2. Security
    - Maintains existing RLS policies
    - QR codes are only visible to ticket owners and event creators
*/

-- Add QR code column to purchased_tickets
ALTER TABLE purchased_tickets
ADD COLUMN qr_code text NOT NULL DEFAULT '';

-- Add unique constraint for QR codes
ALTER TABLE purchased_tickets
ADD CONSTRAINT unique_qr_code UNIQUE (qr_code);

-- Create function to generate unique QR codes
CREATE OR REPLACE FUNCTION generate_unique_qr_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    new_qr text;
BEGIN
    -- Generate a random UUID and encode it to base64
    new_qr := encode(digest(gen_random_uuid()::text, 'sha256'), 'base64');
    RETURN new_qr;
END;
$$;

-- Drop existing purchase_tickets function
DROP FUNCTION IF EXISTS purchase_tickets(uuid, uuid, integer, numeric);

-- Recreate purchase_tickets function with QR code generation
CREATE OR REPLACE FUNCTION purchase_tickets(
    p_ticket_type_id uuid,
    p_user_id uuid,
    p_quantity integer,
    p_total_price numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_available_quantity integer;
    v_qr_code text;
    v_i integer;
BEGIN
    -- Check available quantity
    SELECT quantity INTO v_available_quantity
    FROM ticket_types
    WHERE id = p_ticket_type_id
    FOR UPDATE;
    
    IF v_available_quantity < p_quantity THEN
        RAISE EXCEPTION 'Not enough tickets available';
    END IF;

    -- Update ticket type quantity
    UPDATE ticket_types
    SET quantity = quantity - p_quantity
    WHERE id = p_ticket_type_id;

    -- Create individual tickets with unique QR codes
    FOR v_i IN 1..p_quantity LOOP
        -- Generate unique QR code
        v_qr_code := generate_unique_qr_code();
        
        -- Insert individual ticket
        INSERT INTO purchased_tickets (
            user_id,
            ticket_type_id,
            quantity,
            total_price,
            qr_code
        ) VALUES (
            p_user_id,
            p_ticket_type_id,
            1,
            p_total_price / p_quantity,
            v_qr_code
        );
    END LOOP;
END;
$$;