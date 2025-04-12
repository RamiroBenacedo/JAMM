/*
  # Add purchase_tickets function

  Creates a function to handle ticket purchases in a transaction
*/

CREATE OR REPLACE FUNCTION purchase_tickets(
  p_ticket_type_id uuid,
  p_user_id uuid,
  p_quantity integer,
  p_total_price numeric
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if there are enough tickets available
  IF NOT EXISTS (
    SELECT 1 FROM ticket_types
    WHERE id = p_ticket_type_id
    AND quantity >= p_quantity
  ) THEN
    RAISE EXCEPTION 'No hay suficientes entradas disponibles';
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
    total_price
  ) VALUES (
    p_user_id,
    p_ticket_type_id,
    p_quantity,
    p_total_price
  );
END;
$$;