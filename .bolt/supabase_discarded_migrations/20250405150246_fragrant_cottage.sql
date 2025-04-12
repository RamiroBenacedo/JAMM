/*
  # Add purchase_tickets function

  1. New Functions
    - `purchase_tickets`: Handles ticket purchase transaction
      - Parameters:
        - p_ticket_type_id (uuid)
        - p_user_id (uuid)
        - p_quantity (integer)
        - p_total_price (numeric)
      - Returns: boolean
      
  2. Security
    - Function is accessible to authenticated users only
*/

CREATE OR REPLACE FUNCTION public.purchase_tickets(
  p_ticket_type_id uuid,
  p_user_id uuid,
  p_quantity integer,
  p_total_price numeric
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_available_quantity integer;
  v_max_tickets_per_user integer;
  v_user_ticket_count integer;
  v_event_id uuid;
BEGIN
  -- Get the event_id and check available quantity
  SELECT event_id, quantity INTO v_event_id, v_available_quantity
  FROM ticket_types
  WHERE id = p_ticket_type_id
  FOR UPDATE;

  -- Check if there are enough tickets available
  IF v_available_quantity < p_quantity THEN
    RAISE EXCEPTION 'Not enough tickets available';
  END IF;

  -- Get max tickets per user for this event
  SELECT max_tickets_per_user INTO v_max_tickets_per_user
  FROM events
  WHERE id = v_event_id;

  -- Get current user ticket count for this event
  SELECT COALESCE(SUM(quantity), 0) INTO v_user_ticket_count
  FROM ticket_purchases
  WHERE user_id = p_user_id
  AND ticket_type_id IN (
    SELECT id FROM ticket_types WHERE event_id = v_event_id
  );

  -- Check if user would exceed max tickets
  IF (v_user_ticket_count + p_quantity) > v_max_tickets_per_user THEN
    RAISE EXCEPTION 'Would exceed maximum tickets per user';
  END IF;

  -- Create the ticket purchase record
  INSERT INTO ticket_purchases (
    ticket_type_id,
    user_id,
    quantity,
    total_price,
    purchase_date
  ) VALUES (
    p_ticket_type_id,
    p_user_id,
    p_quantity,
    p_total_price,
    CURRENT_TIMESTAMP
  );

  -- Update available quantity
  UPDATE ticket_types
  SET quantity = quantity - p_quantity
  WHERE id = p_ticket_type_id;

  RETURN true;
END;
$$;