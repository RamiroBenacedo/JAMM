/*
  # Update event management functionality

  1. Create function to add courtesy tickets
    - Automatically adds courtesy tickets when a new event is created
    - Sets quantity to 15 by default
    - Only event creator can manage these tickets

  2. Create function to purchase tickets
    - Handles ticket purchase transaction
    - Updates ticket quantities
    - Generates unique QR code
    - Validates purchase constraints

  3. Create function to verify tickets
    - Validates QR code
    - Marks ticket as used
    - Returns ticket details
*/

-- Function to add courtesy tickets when an event is created
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
    'Tickets de cortesía para el evento',
    0,
    15
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for courtesy tickets
DROP TRIGGER IF EXISTS create_courtesy_tickets ON events;
CREATE TRIGGER create_courtesy_tickets
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION add_courtesy_tickets();

-- Function to handle ticket purchases
CREATE OR REPLACE FUNCTION purchase_tickets(
  p_ticket_type_id UUID,
  p_user_id UUID,
  p_quantity INTEGER,
  p_total_price NUMERIC,
  p_qr_code TEXT DEFAULT NULL
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
    active
  ) VALUES (
    p_user_id,
    p_ticket_type_id,
    p_quantity,
    p_total_price,
    COALESCE(p_qr_code, encode(gen_random_bytes(32), 'hex')),
    true
  );
END;
$$ LANGUAGE plpgsql;

-- Function to verify tickets
CREATE OR REPLACE FUNCTION verify_ticket(
  p_qr_code TEXT
)
RETURNS TABLE (
  valid BOOLEAN,
  message TEXT,
  ticket_id UUID,
  event_name TEXT,
  event_date DATE,
  event_time TIME,
  ticket_type TEXT,
  quantity INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH ticket_verification AS (
    UPDATE purchased_tickets pt
    SET active = false
    WHERE pt.qr_code = p_qr_code
    AND pt.active = true
    RETURNING 
      pt.id as ticket_id,
      pt.quantity,
      pt.ticket_type_id
  )
  SELECT 
    true as valid,
    'Ticket verificado exitosamente' as message,
    tv.ticket_id,
    e.name as event_name,
    e.date as event_date,
    e.time as event_time,
    tt.type as ticket_type,
    tv.quantity
  FROM ticket_verification tv
  JOIN ticket_types tt ON tt.id = tv.ticket_type_id
  JOIN events e ON e.id = tt.event_id
  WHERE tv.ticket_id IS NOT NULL;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false,
      'Ticket inválido o ya utilizado',
      NULL::UUID,
      NULL::TEXT,
      NULL::DATE,
      NULL::TIME,
      NULL::TEXT,
      NULL::INTEGER;
  END IF;
END;
$$ LANGUAGE plpgsql;