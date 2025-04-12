import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { v4 as uuidv4 } from 'npm:uuid@9.0.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Function to generate a unique QR code
const generateUniqueQRCode = (ticketId: string, eventId: string, userId: string) => {
  const data = {
    ticketId,
    eventId,
    userId,
    timestamp: new Date().toISOString(),
    nonce: uuidv4()
  };
  
  return Buffer.from(JSON.stringify(data)).toString('base64');
};

// Function to handle ticket purchases and maintain consistency
const purchaseTickets = async (
  supabase,
  ticketTypeId: string,
  userId: string,
  quantity: number,
  totalPrice: number
) => {
  const { data: ticketType, error: ticketError } = await supabase
    .from('ticket_types')
    .select(`
      id,
      quantity,
      event_id
    `)
    .eq('id', ticketTypeId)
    .single();

  if (ticketError) throw new Error('Error fetching ticket type');
  if (!ticketType) throw new Error('Ticket type not found');
  if (ticketType.quantity < quantity) throw new Error('Not enough tickets available');

  // Generate unique QR code
  const qrCode = generateUniqueQRCode(ticketTypeId, ticketType.event_id, userId);

  // Update ticket quantity and create purchase record in a transaction
  const { data, error } = await supabase
    .rpc('purchase_tickets', {
      p_ticket_type_id: ticketTypeId,
      p_user_id: userId,
      p_quantity: quantity,
      p_total_price: totalPrice,
      p_qr_code: qrCode
    });

  if (error) throw error;
  return data;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticketTypeId, userId, quantity, totalPrice } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const result = await purchaseTickets(
      supabase,
      ticketTypeId,
      userId,
      quantity,
      totalPrice
    );

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
});