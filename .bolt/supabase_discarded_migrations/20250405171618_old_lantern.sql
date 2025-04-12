/*
  # Actualizar comportamiento de entradas de cortesía

  1. Cambios
    - Eliminar el límite de cantidad para entradas de cortesía
    - Actualizar la función purchase_tickets para permitir compras de entradas de cortesía
    - Agregar entradas de cortesía a eventos existentes

  2. Seguridad
    - Mantener las políticas de RLS existentes
*/

-- Actualizar la función purchase_tickets para manejar entradas de cortesía
CREATE OR REPLACE FUNCTION purchase_tickets(
  p_ticket_type_id uuid,
  p_user_id uuid,
  p_quantity integer,
  p_total_price numeric
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ticket_type record;
  v_event_id uuid;
  v_is_courtesy boolean;
  v_is_creator boolean;
BEGIN
  -- Obtener información del tipo de entrada y evento
  SELECT 
    tt.*,
    e.id as event_id,
    e.creator_id,
    tt.type = 'Cortesía' as is_courtesy
  INTO v_ticket_type
  FROM ticket_types tt
  JOIN events e ON e.id = tt.event_id
  WHERE tt.id = p_ticket_type_id;

  -- Verificar si el usuario es el creador del evento
  v_is_creator := EXISTS (
    SELECT 1 FROM events
    WHERE id = v_ticket_type.event_id
    AND creator_id = p_user_id
  );

  -- Para entradas de cortesía, verificar que el usuario sea el creador
  IF v_ticket_type.is_courtesy AND NOT v_is_creator THEN
    RAISE EXCEPTION 'Solo el creador del evento puede usar entradas de cortesía';
  END IF;

  -- Para entradas normales, verificar disponibilidad
  IF NOT v_ticket_type.is_courtesy AND v_ticket_type.quantity < p_quantity THEN
    RAISE EXCEPTION 'No hay suficientes entradas disponibles';
  END IF;

  -- Crear el registro de compra
  INSERT INTO purchased_tickets (
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

  -- Actualizar cantidad solo para entradas no cortesía
  IF NOT v_ticket_type.is_courtesy THEN
    UPDATE ticket_types
    SET quantity = quantity - p_quantity
    WHERE id = p_ticket_type_id;
  END IF;

  RETURN true;
END;
$$;

-- Asegurarse de que todos los eventos tengan entradas de cortesía
INSERT INTO ticket_types (
  event_id,
  type,
  description,
  price,
  quantity
)
SELECT 
  id as event_id,
  'Cortesía' as type,
  'Entrada de cortesía para invitados especiales' as description,
  0 as price,
  999999 as quantity -- Un número muy alto para representar "ilimitado"
FROM events e
WHERE NOT EXISTS (
  SELECT 1 
  FROM ticket_types tt 
  WHERE tt.event_id = e.id 
  AND tt.type = 'Cortesía'
);

-- Actualizar las entradas de cortesía existentes para que sean "ilimitadas"
UPDATE ticket_types
SET quantity = 999999
WHERE type = 'Cortesía';