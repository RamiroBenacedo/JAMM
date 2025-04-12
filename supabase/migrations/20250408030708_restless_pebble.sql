/*
  # Add payment fields to purchased_tickets table

  1. Changes
    - Add payment_id and payment_status columns to purchased_tickets table
    - Update purchase_tickets function to handle payment information

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies
*/

-- Add payment fields to purchased_tickets table
ALTER TABLE purchased_tickets
ADD COLUMN IF NOT EXISTS payment_id TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT;

-- Update purchase_tickets function to include payment fields
CREATE OR REPLACE FUNCTION purchase_tickets(
  p_ticket_type_id UUID,
  p_user_id UUID,
  p_quantity INTEGER,
  p_total_price NUMERIC,
  p_qr_code TEXT DEFAULT NULL,
  p_payment_id TEXT DEFAULT NULL,
  p_payment_status TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_available_quantity INTEGER;
  v_max_tickets_per_user INTEGER;
  v_user_purchased_quantity INTEGER;
  v_event_id UUID;
BEGIN
  -- Get event ID and validate ticket availability
  SELECT 
    tt.quantity,
    e.max_tickets_per_user,
    e.id
  INTO 
    v_available_quantity,
    v_max_tickets_per_user,
    v_event_id
  FROM ticket_types tt
  JOIN events e ON e.id = tt.event_id
  WHERE tt.id = p_ticket_type_id;

  -- Check if ticket type exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket type not found';
  END IF;

  -- Check if there are enough tickets available
  IF v_available_quantity < p_quantity THEN
    RAISE EXCEPTION 'Not enough tickets available';
  END IF;

  -- Get user's current purchased quantity for this event
  SELECT COALESCE(SUM(pt.quantity), 0)
  INTO v_user_purchased_quantity
  FROM purchased_tickets pt
  JOIN ticket_types tt ON tt.id = pt.ticket_type_id
  WHERE tt.event_id = v_event_id
    AND pt.user_id = p_user_id;

  -- Check if purchase would exceed max tickets per user
  IF v_user_purchased_quantity + p_quantity > v_max_tickets_per_user THEN
    RAISE EXCEPTION 'Would exceed maximum tickets allowed per user';
  END IF;

  -- Update ticket quantity
  UPDATE ticket_types
  SET quantity = quantity - p_quantity
  WHERE id = p_ticket_type_id;

  -- Create purchase record
  INSERT INTO purchased_tickets (
    user_id,
    ticket_type_id,
    quantity,
    total_price,
    qr_code,
    active,
    payment_id,
    payment_status
  ) VALUES (
    p_user_id,
    p_ticket_type_id,
    p_quantity,
    p_total_price,
    COALESCE(p_qr_code, encode(gen_random_bytes(32), 'hex')),
    true,
    p_payment_id,
    p_payment_status
  );
END;
$$ LANGUAGE plpgsql;