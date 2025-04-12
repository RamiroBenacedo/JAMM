/*
  # Update payment processing functionality

  1. Create function to process payments
    - Handles payment confirmation from MercadoPago
    - Creates purchased tickets
    - Updates ticket quantities
    - Generates QR codes

  2. Update existing functions
    - Add payment processing support
    - Improve error handling
*/

-- Function to process payments and create tickets
CREATE OR REPLACE FUNCTION process_payment(
  p_event_id UUID,
  p_user_id UUID,
  p_payment_id BIGINT,
  p_payment_status TEXT,
  p_payment_amount NUMERIC
)
RETURNS VOID AS $$
BEGIN
  -- Validate payment status
  IF p_payment_status != 'approved' THEN
    RAISE EXCEPTION 'Payment not approved';
  END IF;

  -- Create purchase record and tickets
  INSERT INTO purchased_tickets (
    user_id,
    ticket_type_id,
    quantity,
    total_price,
    qr_code,
    active,
    payment_id,
    payment_status
  )
  SELECT
    p_user_id,
    tt.id,
    1,
    tt.price,
    encode(gen_random_bytes(32), 'hex'),
    true,
    p_payment_id,
    p_payment_status
  FROM ticket_types tt
  WHERE tt.event_id = p_event_id
  AND tt.quantity > 0;

  -- Update ticket quantities
  UPDATE ticket_types
  SET quantity = quantity - 1
  WHERE event_id = p_event_id
  AND quantity > 0;

END;
$$ LANGUAGE plpgsql;